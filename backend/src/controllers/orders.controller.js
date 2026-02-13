import prisma from "../lib/prisma.js";

const toOrderDTO = (o) => ({
  id: o.id.toString(),
  customerId: o.customerId ? o.customerId.toString() : null,
  total: o.total,
  status: o.status,
  channel: o.channel,
  contactPhone: o.contactPhone,
  notes: o.notes,
  confirmedAt: o.confirmedAt,
  createdAt: o.createdAt,
  items: o.items?.map((it) => ({
    id: it.id.toString(),
    productId: it.productId.toString(),
    quantity: it.quantity,
    price: it.price,
    product: it.product
      ? {
          id: it.product.id.toString(),
          name: it.product.name,
          ageRestricted: it.product.ageRestricted,
        }
      : undefined,
  })),
});

export const createOrder = async (req, res) => {
  try {
    // Body esperado:
    // {
    //   items: [{ productId: "1", quantity: 2 }, ...],
    //   channel: "WEB" | "WHATSAPP",
    //   contactPhone: "300123...",
    //   notes: "..."
    // }
    const { items, channel, contactPhone, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items is required (non-empty array)" });
    }

    // Validar cantidades
    for (const it of items) {
      const qty = Number(it?.quantity);
      if (!it?.productId || !Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({
          message: "Each item must have productId and quantity > 0",
        });
      }
    }

    // Encontrar customer por userId (vinculación)
    const userId = BigInt(req.userId);

    const customer = await prisma.customer.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer profile not found. Create /api/customers/me first.",
      });
    }

    // Transacción completa
    const result = await prisma.$transaction(async (tx) => {
      // 1) Traer productos de la BD
      const productIds = [...new Set(items.map((i) => BigInt(i.productId)))];

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, price: true, stock: true, ageRestricted: true, name: true },
      });

      // 2) Validar que existan todos
      const map = new Map(products.map((p) => [p.id.toString(), p]));
      for (const it of items) {
        if (!map.has(BigInt(it.productId).toString())) {
          return {
            ok: false,
            status: 404,
            message: `Product not found: ${it.productId}`,
          };
        }
      }

      // 3) Validar stock + calcular total (price desde BD)
      let total = 0;

      // sumamos por producto (por si viene repetido)
      const qtyByProduct = new Map(); // productIdStr -> qty
      for (const it of items) {
        const pid = BigInt(it.productId).toString();
        const current = qtyByProduct.get(pid) || 0;
        qtyByProduct.set(pid, current + Number(it.quantity));
      }

      for (const [pid, qty] of qtyByProduct.entries()) {
        const p = map.get(pid);
        if (!p) continue;

        if (p.stock < qty) {
          return {
            ok: false,
            status: 409,
            message: `Not enough stock for product ${p.name} (id=${pid}). Available=${p.stock}, requested=${qty}`,
          };
        }

        // Prisma Decimal: toString para operar con Number sin líos
        const priceNum = Number(p.price.toString());
        total += priceNum * qty;
      }

      // 4) Crear Order
      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          total, // Prisma convierte a Decimal si tu campo es Decimal
          status: "WHATSAPP_PENDING",
          channel: channel || "WHATSAPP",
          contactPhone: contactPhone ?? null,
          notes: notes ?? null,
        },
        select: { id: true },
      });

      // 5) Crear OrderItems con price desde BD
      const orderItemsData = [];

      for (const [pid, qty] of qtyByProduct.entries()) {
        const p = map.get(pid);
        orderItemsData.push({
          orderId: order.id,
          productId: BigInt(pid),
          quantity: qty,
          price: p.price, // se guarda el price actual
        });
      }

      await tx.orderItem.createMany({
        data: orderItemsData,
      });

      // 6) Descontar stock
      for (const [pid, qty] of qtyByProduct.entries()) {
        await tx.product.update({
          where: { id: BigInt(pid) },
          data: { stock: { decrement: qty } },
        });
      }

      // 7) Devolver orden completa
      const fullOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: { product: true },
            orderBy: { id: "asc" },
          },
        },
      });

      return { ok: true, order: fullOrder };
    });

    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.status(201).json(toOrderDTO(result.order));
  } catch (err) {
    console.log("CREATE_ORDER_ERROR:", err);
    return res.status(500).json({ message: "Failed to create order!", detail: err.message });
  }
};
