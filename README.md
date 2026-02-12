<div align="center"> <img src="https://raw.githubusercontent.com/github/explore/main/topics/nodejs/nodejs.png" width="128px" /> <h1>Backend API – Node.js / Express / Prisma / MySQL</h1> <p align="center"> <strong>Backend moderno, modular y escalable para aplicaciones web y móviles</strong> </p> </div>

⭐️ ¡Dale una estrella al repositorio si este proyecto te fue útil!

Este proyecto es un backend completo construido con:

🚀 Node.js + Express
🗄️ Prisma ORM
🐬 MySQL
🛡 JWT Authentication
🔐 Bcrypt Password Hashing

Perfecto para aplicaciones SaaS, paneles administrativos, aplicaciones móviles o sistemas empresariales.

✨ Características principales

🔐 Autenticación JWT (login, registro, perfil)

🔒 Contraseñas encriptadas con bcrypt

🗂 Estructura modular por controladores y rutas

🧩 ORM Prisma con migraciones automáticas

🗄 Conexión eficiente a base de datos MySQL

🔁 Scripts de desarrollo con Nodemon

🌱 Seed automático de datos iniciales

⚙️ Variables de entorno con dotenv

🧪 Rutas CRUD de usuarios listas para producción

🌐 Stack Tecnológico

| Tecnología     | Propósito                      |
| -------------- | ------------------------------ |
| **Node.js**    | Motor del backend              |
| **Express.js** | Framework HTTP minimalista     |
| **Prisma ORM** | Acceso moderno a base de datos |
| **MySQL**      | Base de datos relacional       |
| **JWT**        | Autenticación segura           |
| **Bcrypt**     | Cifrado de contraseñas         |
| **Nodemon**    | Live reload en desarrollo      |


🚀 Endpoints principales (Postman Ready)
🔑 Auth

| Método | Ruta                 | Descripción                 |
| ------ | -------------------- | --------------------------- |
| `POST` | `/api/auth/register` | Registrar usuario           |
| `POST` | `/api/auth/login`    | Iniciar sesión              |
| `GET`  | `/api/users/me`      | Ver perfil (requiere token) |

👤 Users

| Método   | Ruta             | Descripción        |
| -------- | ---------------- | ------------------ |
| `GET`    | `/api/users`     | Listar usuarios    |
| `GET`    | `/api/users/:id` | Obtener usuario    |
| `PUT`    | `/api/users/:id` | Actualizar usuario |
| `DELETE` | `/api/users/:id` | Eliminar usuario   |


📁 Estructura del proyecto

backend/
│── prisma/
│   ├── schema.prisma
│   └── migrations/
│
│── src/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── lib/
│   └── app.js
│
│── scripts/
│   └── seed.js
│
│── .env
│── package.json
│── README.md

🔧 Configuración
1️⃣ Clonar repositorio
git clone https://github.com/tu-usuario/tu-repo.git
cd tu-repo

2️⃣ Instalar dependencias
npm install

3️⃣ Configurar variables de entorno .env
DATABASE_URL="mysql://user:password@localhost:3306/mi_basedatos"
JWT_SECRET="superclaveultrasecreta"


4️⃣ Ejecutar Prisma
Generar cliente
npm run prisma:generate

Ejecutar migraciones
npm run prisma:migrate:dev

5️⃣ Ejecutar servidor en modo desarrollo
npm run dev


Servidor corriendo en:

http://localhost:3000

🎯 Puntos que puedes agregar luego

Documentación Swagger/OpenAPI

Sistema de roles y permisos

Dockerfile + docker-compose

Integración con AWS RDS

Tests automatizados con Jest

Modularización avanzada tipo microservicios