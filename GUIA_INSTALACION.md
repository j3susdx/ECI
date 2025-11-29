# Guía de Instalación y Ejecución - Sistema de Evaluación de Clases

Esta guía describe los pasos necesarios para instalar y ejecutar la aplicación web en un entorno local.

## Prerrequisitos

Asegúrese de tener instalado lo siguiente en su sistema:

1.  **Node.js**: Versión 18 o superior. [Descargar Node.js](https://nodejs.org/)
2.  **PostgreSQL**: Base de datos relacional. [Descargar PostgreSQL](https://www.postgresql.org/)
3.  **Git**: Para clonar el repositorio (opcional si ya tiene los archivos).

## Pasos de Instalación

### 1. Obtener el Código
Si tiene el código en un archivo comprimido, extráigalo. Si usa Git:
```bash
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DE_LA_CARPETA>
```

### 2. Instalar Dependencias
Abra una terminal en la carpeta del proyecto y ejecute:
```bash
npm install
```
Esto descargará todas las librerías necesarias listadas en `package.json`.

### 3. Configurar Variables de Entorno
Cree un archivo llamado `.env` en la raíz del proyecto (puede copiar `.env.local` si existe o crear uno nuevo) y agregue las siguientes variables:

```env
# Conexión a la base de datos PostgreSQL
# Formato: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/nombre_bd"

# Secreto para la autenticación (puede generar uno con `openssl rand -base64 32`)
AUTH_SECRET="tu_secreto_super_seguro"

# API Key de Google Gemini para las funciones de IA
GEMINI_API_KEY="tu_api_key_de_gemini"
```

> **Nota**: Asegúrese de crear la base de datos vacía en PostgreSQL con el nombre que especificó en `DATABASE_URL`.

### 4. Configurar la Base de Datos
Ejecute el siguiente comando para crear las tablas en su base de datos:
```bash
npx prisma db push
```
(Alternativamente, si usa migraciones: `npx prisma migrate dev`)

### 5. Ejecutar en Modo Desarrollo
Para iniciar la aplicación en modo de desarrollo (con recarga automática):
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

### 6. Ejecutar en Producción (Opcional)
Para un entorno de producción, primero construya la aplicación y luego iníciela:
```bash
npm run build
npm start
```

## Comandos Útiles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo. |
| `npm run build` | Compila la aplicación para producción. |
| `npm start` | Inicia el servidor de producción (requiere build previo). |
| `npx prisma studio` | Abre una interfaz visual para ver y editar la base de datos. |
| `npx prisma db push` | Sincroniza el esquema de Prisma con la base de datos. |

## Solución de Problemas Comunes

-   **Error de conexión a base de datos**: Verifique que PostgreSQL esté corriendo y que la `DATABASE_URL` sea correcta.
-   **Error de API Key**: Si las funciones de IA fallan, verifique que `GEMINI_API_KEY` sea válida.
-   **Puerto ocupado**: Si el puerto 3000 está en uso, Next.js intentará usar el 3001 automáticamente.
