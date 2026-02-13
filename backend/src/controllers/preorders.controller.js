import prisma from "../lib/prisma.js";

const toPreOrderDTO = (po) => ({
  id: po.id.toString(),
  customerId: po.customerId ? po.customerId.toString() : null,
  guestName: po.guestName,
  guestPhone: po.guestPhone,
  guestCity: po.guestCity,
  total: po.total,
  status: po.status,
  whatsappLink: po.whatsappLink,
  createdAt: po.createdAt,
  items: po.items?.map((it) => ({
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

const buildWhatsAppLink = ({ phone, message }) => {
  const normalized = String(phone || "").replace(/\D/g, ""); // deja solo números
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${normalized}?text=${encoded}`;
};

export const createPreOrder = async (req, res) => {
  try {
    // Body esperado:
    // {
    //   items: [{ productId: "1", quantity: 2 }, ...],
    //   guestName?: "Juan",
    //   guestPhone?: "3001234567",
    //   guestCity?: "Valledupar",
    //   whatsappTo?: "573001112233"   // número del negocio (recomendado por env)
    // }
    const { items, guestName, guestPhone, guestCity, whatsappTo } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items is required (non-empty array)" });
    }

    for (const it of items) {
      const qty = Number(it?.quantity);
      if (!it?.productId || !Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({
          message: "Each item must have productId and quantity > 0",
        });
      }
    }

    // Si está logueado y tiene customer, lo vinculamos.
    // Si no, queda como guest.
    let customerId = null;

    if (req.userId) {
      const userId = BigInt(req.userId);
      const customer = await prisma.customer.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (customer) customerId = customer.id;
    }

    // Para guest, mínimo debe existir un teléfono (para contacto)
    if (!customerId && (!guestPhone || String(guestPhone).trim().length < 7)) {
      return res.status(400).json({
        message: "guestPhone is required when customer profile is not linked.",
      });
    }

    const businessWhatsApp = whatsappTo || process.env.WHATSAPP_BUSINESS || "573001112233";

    const result = await prisma.$transaction(async (tx) => {
      // Traer productos
      const productIds = [...new Set(items.map((i) => BigInt(i.productId)))];

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, price: true, ageRestricted: true },
      });

      const map = new Map(products.map((p) => [p.id.toString(), p]));

      // Validar existencia
      for (const it of items) {
        const pid = BigInt(it.productId).toString();
        if (!map.has(pid)) {
          return { ok: false, status: 404, message: `Product not found: ${it.productId}` };
        }
      }

      // Consolidar cantidades por producto
      const qtyByProduct = new Map();
      for (const it of items) {
        const pid = BigInt(it.productId).toString();
        qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + Number(it.quantity));
      }

      // Calcular total y construir resumen
      let total = 0;
      const lines = [];
      for (const [pid, qty] of qtyByProduct.entries()) {
        const p = map.get(pid);
        const priceNum = Number(p.price.toString());
        const sub = priceNum * qty;
        total += sub;
        lines.push(`- ${p.name} x${qty} = ${sub.toLocaleString("es-CO")}`);
      }

      // Mensaje WhatsApp
      const customerText = customerId
        ? "Cliente registrado"
        : `Invitado: ${guestName || "N/A"} | Tel: ${guestPhone || "N/A"} | Ciudad: ${guestCity || "N/A"}`;

      const message = [
        "🛒 *Preorden Ecommerce*",
        customerText,
        "",
        "📦 *Items:*",
        ...lines,
        "",
        `💰 *Total:* ${total.toLocaleString("es-CO")}`,
        "",
        "✅ Por favor confirmar disponibilidad y forma de pago.",
      ].join("\n");

      const whatsappLink = buildWhatsAppLink({
        phone: businessWhatsApp,
        message,
      });

      // Crear preorden
      const preOrder = await tx.preOrder.create({
        data: {
          customerId: customerId,
          guestName: customerId ? null : (guestName ?? null),
          guestPhone: customerId ? null : String(guestPhone ?? "").trim(),
          guestCity: customerId ? null : (guestCity ?? null),
          total,
          status: "SENT", // en tu tabla existe SENT, puedes cambiar a DRAFT si prefieres
          whatsappLink,
        },
        select: { id: true },
      });

      // Crear items
      const dataItems = [];
      for (const [pid, qty] of qtyByProduct.entries()) {
        const p = map.get(pid);
        dataItems.push({
          preOrderId: preOrder.id,
          productId: BigInt(pid),
          quantity: qty,
          price: p.price,
        });
      }

      await tx.preOrderItem.createMany({ data: dataItems });

      // Devolver completo
      const full = await tx.preOrder.findUnique({
        where: { id: preOrder.id },
        include: {
          items: {
            include: { product: true },
            orderBy: { id: "asc" },
          },
        },
      });

      return { ok: true, preOrder: full };
    });

    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.status(201).json(toPreOrderDTO(result.preOrder));
  } catch (err) {
    console.log("CREATE_PREORDER_ERROR:", err);
    return res.status(500).json({ message: "Failed to create pre-order!", detail: err.message });
  }
};
