import z from "zod";

const loginSchema = z.object({
  email: z.string().email("Correo inválido").min(1, "Correo es requerido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export default loginSchema;