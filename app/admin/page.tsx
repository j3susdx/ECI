"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, Search, UserCog, Trash2, Loader2, LogOut, 
  Plus, UserPlus 
} from "lucide-react";
import { 
  getAllUsersAction, updateUserRoleAction, deleteUserAction, createUserAction, // Importamos la nueva acción
  getAllCoursesAction, createCourseAction, assignProfessorToCourseAction, deleteCourseAction 
} from "@/lib/server-actions";
import { toast, Toaster } from "sonner"; 
import { signOutToLogin } from "@/actions/signout.action";
import { cn } from "@/lib/utils"; 

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [activeTab, setActiveTab] = useState("users");

  // --- ESTADO PARA NUEVO USUARIO ---
  const [newUser, setNewUser] = useState({ name: "", lastName: "", email: "", password: "", role: "STUDENT" });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // --- ESTADO PARA NUEVO CURSO ---
  const [newCourse, setNewCourse] = useState({ code: "", name: "", professorId: "" });
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  // Carga inicial
  const loadAllData = async () => {
    try {
      const [usersRes, coursesRes] = await Promise.all([
        getAllUsersAction(),
        getAllCoursesAction()
      ]);

      if (usersRes.success && usersRes.users) setUsers(usersRes.users);
      if (coursesRes.success && coursesRes.courses) setCourses(coursesRes.courses);
    } catch (error) {
      toast.error("Error de conexión al actualizar datos");
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadAllData();
      setLoading(false);
    };
    init();
  }, []);

  // --- HANDLERS USUARIOS ---

  // 1. CREAR USUARIO (NUEVO)
  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.lastName || !newUser.email || !newUser.password) {
      toast.warning("Completa todos los campos del usuario");
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await createUserAction(newUser);
      
      if (res.success) {
        toast.success("¡Usuario registrado exitosamente!");
        setNewUser({ name: "", lastName: "", email: "", password: "", role: "STUDENT" }); // Limpiar form
        await loadAllData(); // Recargar lista
      } else {
        toast.error(res.error || "Error al crear usuario");
      }
    } catch (e) {
      toast.error("Error inesperado");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    toast.promise(updateUserRoleAction(id, role), {
      loading: 'Actualizando...',
      success: (data) => { 
        if(data.success) {
          setUsers(users.map(u => u.id === id ? { ...u, role } : u)); 
          return "Rol actualizado correctamente"; 
        }
        throw new Error(data.error as string); 
      },
      error: 'Error al actualizar'
    });
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("¿Eliminar usuario?")) return;
    const res = await deleteUserAction(id);
    if (res.success) { 
      setUsers(users.filter(u => u.id !== id)); 
      toast.success("Usuario eliminado"); 
    } else {
      toast.error("Error al eliminar");
    }
  };

  // --- HANDLERS CURSOS ---
  const handleCreateCourse = async () => {
    if (!newCourse.code || !newCourse.name || !newCourse.professorId) {
      toast.warning("Completa todos los campos del curso");
      return;
    }

    setIsCreatingCourse(true);
    try {
      const res = await createCourseAction(newCourse);
      
      if (res.success) {
        toast.success("¡Curso creado exitosamente!");
        setNewCourse({ code: "", name: "", professorId: "" });
        await loadAllData();
        setActiveTab("courses");
      } else {
        toast.error(res.error || "Error al crear curso");
      }
    } catch (e) { 
      toast.error("Error inesperado"); 
    } finally { 
      setIsCreatingCourse(false); 
    }
  };

  const handleAssignProfessor = async (courseId: string, professorId: string) => {
    toast.promise(assignProfessorToCourseAction(courseId, professorId), {
      loading: 'Asignando...',
      success: (data) => {
        if(data.success) {
          const prof = users.find(u => u.id === professorId);
          setCourses(courses.map(c => c.id === courseId ? { ...c, professor: prof, professorId } : c));
          return "Docente asignado";
        }
        throw new Error("Error");
      },
      error: 'No se pudo asignar'
    });
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("¿Eliminar curso?")) return;
    const res = await deleteCourseAction(id);
    if (res.success) { 
      setCourses(courses.filter(c => c.id !== id)); 
      toast.success("Curso eliminado"); 
    } else {
      toast.error("Error al eliminar");
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const professorsList = users.filter(u => u.role === "PROFESSOR" || u.role === "ADMIN");

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary"/>
        <p className="text-muted-foreground">Cargando panel...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 p-8 relative">
      <Toaster position="top-right" richColors />

      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <div className="flex gap-3 items-center">
            <div className="p-3 bg-primary rounded-lg text-white shadow-lg"><Shield className="h-8 w-8"/></div>
            <div><h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1><p className="text-muted-foreground">Centro de control</p></div>
          </div>
          <Button onClick={signOutToLogin} variant="outline" className="gap-2 hover:bg-red-50 hover:text-red-600 border-red-100">
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-white border shadow-sm">
            <TabsTrigger value="users">Gestión de Usuarios</TabsTrigger>
            <TabsTrigger value="courses">Gestión de Cursos & Docentes</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            
            {/* --- SECCIÓN NUEVA: CREAR USUARIO --- */}
            <Card className="border-2 border-dashed bg-white/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                  <UserPlus className="h-5 w-5 text-primary"/> Registrar Nuevo Usuario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                  <div className="grid gap-2 col-span-1">
                    <label className="text-xs font-medium text-gray-500">NOMBRE</label>
                    <Input placeholder="Juan" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="bg-white" />
                  </div>
                  <div className="grid gap-2 col-span-1">
                    <label className="text-xs font-medium text-gray-500">APELLIDO</label>
                    <Input placeholder="Pérez" value={newUser.lastName} onChange={e => setNewUser({...newUser, lastName: e.target.value})} className="bg-white" />
                  </div>
                  <div className="grid gap-2 col-span-2">
                    <label className="text-xs font-medium text-gray-500">EMAIL</label>
                    <Input placeholder="juan@ejemplo.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="bg-white" />
                  </div>
                  <div className="grid gap-2 col-span-1">
                    <label className="text-xs font-medium text-gray-500">CONTRASEÑA</label>
                    <Input type="password" placeholder="******" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="bg-white" />
                  </div>
                  <div className="grid gap-2 col-span-1">
                    <label className="text-xs font-medium text-gray-500">ROL</label>
                    <Select value={newUser.role} onValueChange={v => setNewUser({...newUser, role: v})}>
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STUDENT">Estudiante</SelectItem>
                        <SelectItem value="PROFESSOR">Profesor</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleCreateUser} disabled={isCreatingUser} className="min-w-[140px]">
                    {isCreatingUser ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Plus className="h-4 w-4 mr-2" />} Registrar Usuario
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* --- LISTA DE USUARIOS --- */}
            <Card className="border-none shadow-md">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle>Usuarios Registrados ({filteredUsers.length})</CardTitle>
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar por nombre o email..." className="pl-9 bg-gray-50" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead>Usuario</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead className="text-center">Evals</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(u => (
                        <TableRow key={u.id} className="hover:bg-gray-50/50">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{u.name} {u.lastName}</span>
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("w-24 justify-center", u.role === 'ADMIN' ? 'bg-orange-100 text-orange-700' : u.role === 'PROFESSOR' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center"><Badge variant="secondary">{u._count?.evaluations || 0}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Select defaultValue={u.role} onValueChange={v => handleRoleChange(u.id, v)}>
                                <SelectTrigger className="w-32 h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="STUDENT">Estudiante</SelectItem>
                                  <SelectItem value="PROFESSOR">Profesor</SelectItem>
                                  <SelectItem value="ADMIN">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => handleDeleteUser(u.id)}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- GESTIÓN DE CURSOS (Sin cambios, solo se muestra para completitud) --- */}
          <TabsContent value="courses" className="space-y-6">
            <Card className="border-2 border-dashed bg-white/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-gray-700"><Plus className="h-5 w-5 text-primary"/> Agregar Nuevo Curso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="grid w-full gap-2">
                    <label className="text-xs font-medium text-gray-500">CÓDIGO (ID)</label>
                    <Input placeholder="Ej: soft-101" value={newCourse.code} onChange={e => setNewCourse({...newCourse, code: e.target.value})} className="bg-white" />
                  </div>
                  <div className="grid w-full gap-2">
                    <label className="text-xs font-medium text-gray-500">NOMBRE</label>
                    <Input placeholder="Nombre del curso" value={newCourse.name} onChange={e => setNewCourse({...newCourse, name: e.target.value})} className="bg-white" />
                  </div>
                  <div className="grid w-full gap-2">
                    <label className="text-xs font-medium text-gray-500">DOCENTE</label>
                    <Select value={newCourse.professorId} onValueChange={v => setNewCourse({...newCourse, professorId: v})}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {professorsList.map(p => <SelectItem key={p.id} value={p.id}>{p.name} {p.lastName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateCourse} disabled={isCreatingCourse} className="min-w-[120px]">
                    {isCreatingCourse ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Plus className="h-4 w-4 mr-2" />} Crear
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader><CardTitle>Catálogo de Cursos ({courses.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Docente</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.map((course) => (
                        <TableRow key={course.id} className="hover:bg-gray-50/50">
                          <TableCell className="font-mono text-xs font-medium">{course.code}</TableCell>
                          <TableCell className="font-medium">{course.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserCog className="h-3.5 w-3.5 text-purple-600" />
                              <Select defaultValue={course.professorId} onValueChange={(val) => handleAssignProfessor(course.id, val)}>
                                <SelectTrigger className="h-8 w-[240px] text-xs bg-white border-gray-200"><SelectValue>{course.professor ? `${course.professor.name} ${course.professor.lastName}` : "Sin asignar"}</SelectValue></SelectTrigger>
                                <SelectContent>{professorsList.map(p => <SelectItem key={p.id} value={p.id}>{p.name} {p.lastName}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => handleDeleteCourse(course.id)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}