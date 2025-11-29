import bcrypt from "bcryptjs";

// Encriptar contraseña

export async function encryptPassword(password: string) {
    return await bcrypt.hash(password, 10);
}

// Comprar contraseñas
export async function comparePassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
}
