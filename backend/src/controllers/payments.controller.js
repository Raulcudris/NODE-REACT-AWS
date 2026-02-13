import prisma from "../lib/prisma.js";

const toPaymentDTO = (p) => ({
  id: p.id.toString(),
  orderId: p.orderId.toString(),
  amount: p.amount,
  method: p.method,
  status: p.status,
  createdAt: p.createdAt,
  order: p.order
    ? {
        id: p.order.id.toString(),
        customerId: p.order.customerId ? p.order.customerId.toString() : null,
        total: p.order.total,
        status: p.order.status,
        channel: p.order.channel,
        createdAt: p.order.createdAt,
      }
    : undefined,
});

const isPrivileged = (role) => role === "ADMIN" || role === "OPERATOR";

export const createPayment = async (req, res) => {
  try {
    // Body:
    // {
    //   "orderId": "1",
    //   "amount": 150,
    //   "method": "CARD" | "CASH" | "PSE" | "TRANSFER",
    //   "status": "APPROVED" | "REJECTED"   (opcional)
    // }
    const { orderId, amount, method, status } = req.body;

    if (!orderId || amount === undefined || !method) {
      return res.status(400).json({ message: "orderId, amount and method are required" });
    }

    const orderIdBig = BigInt(orderId);

    // Verificar order existe
    const order = await prisma.order.findUnique({
      where: { id: orderIdBig },
      select: { id: true, customerId: true, total: true },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Reglas de autorización:
    // - ADMIN/OPERATOR puede registrar pagos a cualquier orden
    // - CUSTOMER solo puede registrar pagos de su propia orden
    if (!isPrivileged(req.userRole)) {
      const userId = BigInt(req.userId);
      const customer = await prisma.customer.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (!customer || !order.customerId || customer.id !== order.customerId) {
        return res.status(403).json({ message: "Not Authorized!" });
      }
    }

    // Normalizar
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
      return res.status(400).json({ message: "amount must be a valid number >= 0" });
    }

    // status por defecto
    const paymentStatus = status || "APPROVED";

    // Por tu UNIQUE(order_id), hacemos upsert:
    // - si existe payment para esa order: update
    // - si no existe: create
    const payment = await prisma.payment.upsert({
      where: { orderId: orderIdBig },
      update: {
        amount: normalizedAmount,
        method,
        status: paymentStatus,
      },
      create: {
        orderId: orderIdBig,
        amount: normalizedAmount,
        method,
        status: paymentStatus,
      },
      include: { order: true },
    });

    return res.status(201).json(toPaymentDTO(payment));
  } catch (err) {
    console.log("CREATE_PAYMENT_ERROR:", err);
    return res.status(500).json({ message: "Failed to register payment!", detail: err.message });
  }
};

export const getPaymentByOrderId = async (req, res) => {
  try {
    const orderId = BigInt(req.params.orderId);

    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: { order: true },
    });

    if (!payment) return res.status(404).json({ message: "Payment not found for this order" });

    // Autorizar: dueño o admin/op
    if (!isPrivileged(req.userRole)) {
      const userId = BigInt(req.userId);
      const customer = await prisma.customer.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (!customer || !payment.order.customerId || customer.id !== payment.order.customerId) {
        return res.status(403).json({ message: "Not Authorized!" });
      }
    }

    return res.status(200).json(toPaymentDTO(payment));
  } catch (err) {
    console.log("GET_PAYMENT_ERROR:", err);
    return res.status(400).json({ message: "Invalid orderId" });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    // PATCH /api/payments/:orderId/status
    // Body: { "status": "APPROVED" | "REJECTED" }
    if (!isPrivileged(req.userRole)) {
      return res.status(403).json({ message: "Only ADMIN/OPERATOR can change payment status" });
    }

    const orderId = BigInt(req.params.orderId);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "status is required" });
    }

    // Verificar existe payment
    const existing = await prisma.payment.findUnique({
      where: { orderId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Payment not found for this order" });
    }

    const updated = await prisma.payment.update({
      where: { orderId },
      data: { status },
      include: { order: true },
    });

    return res.status(200).json(toPaymentDTO(updated));
  } catch (err) {
    console.log("UPDATE_PAYMENT_STATUS_ERROR:", err);
    return res.status(500).json({ message: "Failed to update payment status!", detail: err.message });
  }
};
