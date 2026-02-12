import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";

async function main() {
  console.log("🌱 Seeding database...");

  // 1) Limpieza (orden importante por relaciones)
  await prisma.chatSeen.deleteMany();
  await prisma.chatUser.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.savedPost.deleteMany();
  await prisma.postDetail.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Database cleaned.");

  // 2) Crear usuarios
  const passwordHash = await bcrypt.hash("123456", 10);

  const [u1, u2, u3] = await prisma.$transaction([
    prisma.user.create({
      data: {
        username: "raulito",
        email: "raulito@test.com",
        password: passwordHash,
        avatar: "https://example.com/avatars/raulito.png",
      },
    }),
    prisma.user.create({
      data: {
        username: "makiia",
        email: "makiia@test.com",
        password: passwordHash,
        avatar: "https://example.com/avatars/makiia.png",
      },
    }),
    prisma.user.create({
      data: {
        username: "demo",
        email: "demo@test.com",
        password: passwordHash,
        avatar: null,
      },
    }),
  ]);

  console.log("👤 Users created:", { u1: u1.id, u2: u2.id, u3: u3.id });

  // 3) Crear posts + details
  const posts = [];

  for (const user of [u1, u2, u3]) {
    for (let i = 1; i <= 2; i++) {
      const post = await prisma.post.create({
        data: {
          title: `Post ${i} de ${user.username}`,
          price: 150000 + i * 50000,
          address: `Calle ${10 + i} #${20 + i}-0${i}`,
          city: "Valledupar",
          bedroom: 2 + (i % 2),
          bathroom: 1 + (i % 2),
          latitude: "10.463140",
          longitude: "-73.253220",
          type: i % 2 === 0 ? "rent" : "buy",
          property: i % 2 === 0 ? "apartment" : "house",
          images: [
            `https://picsum.photos/seed/${user.username}-${i}-1/800/600`,
            `https://picsum.photos/seed/${user.username}-${i}-2/800/600`,
          ],
          userId: user.id,
          postDetail: {
            create: {
              desc: `Descripción del post ${i} para ${user.username}.`,
              utilities: "Agua, luz",
              pet: i % 2 === 0 ? "Sí" : "No",
              income: "No requerido",
              size: 80 + i * 10,
              school: 10,
              bus: 5,
              restaurant: 7,
            },
          },
        },
        include: { postDetail: true },
      });

      posts.push(post);
    }
  }

  console.log(`🏠 Posts created: ${posts.length}`);

  // 4) Saved posts (u1 guarda posts de u2 y u3)
  await prisma.savedPost.createMany({
    data: [
      { userId: u1.id, postId: posts.find(p => p.userId === u2.id).id },
      { userId: u1.id, postId: posts.find(p => p.userId === u3.id).id },
    ],
    skipDuplicates: true,
  });

  console.log("⭐ SavedPosts created (u1 guardó posts de otros).");

  // 5) Crear chat entre u1 y u2
  const chat = await prisma.chat.create({
    data: {
      lastMessage: null,
      users: {
        create: [
          { userId: u1.id },
          { userId: u2.id },
        ],
      },
    },
    include: { users: true },
  });

  console.log("💬 Chat created:", chat.id);

  // 6) Mensajes
  const msg1 = await prisma.message.create({
    data: {
      text: "Hola! ¿Sigue disponible el inmueble?",
      userId: u1.id,
      chatId: chat.id,
    },
  });

  const msg2 = await prisma.message.create({
    data: {
      text: "Hola! Sí, aún está disponible. ¿Quieres agendar una visita?",
      userId: u2.id,
      chatId: chat.id,
    },
  });

  // Actualizar lastMessage
  await prisma.chat.update({
    where: { id: chat.id },
    data: { lastMessage: msg2.text },
  });

  console.log("✉️ Messages created:", [msg1.id, msg2.id]);

  // 7) Seen (u1 vio el chat)
  await prisma.chatSeen.create({
    data: {
      chatId: chat.id,
      userId: u1.id,
      seenAt: new Date(),
    },
  });

  console.log("👀 ChatSeen created for u1.");

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });