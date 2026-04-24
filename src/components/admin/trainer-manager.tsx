"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/hooks/use-confirm";
import {
  createTrainer,
  updateTrainer,
  deleteTrainer,
} from "@/app/actions/trainers";
import type { FormState } from "@/lib/schemas";

interface Trainer {
  id: string;
  username: string | null;
  name: string;
  createdAt: Date;
}

interface TrainerFormState {
  success: boolean;
  data?: { id: string; username: string; name: string };
  errors?: Record<string, string[]>;
  message?: string;
}

interface TrainerManagerProps {
  initialTrainers: Trainer[];
}

export function TrainerManager({ initialTrainers }: TrainerManagerProps) {
  const [trainers, setTrainers] = useState<Trainer[]>(initialTrainers);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTrainerId, setEditingTrainerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", password: "" });

  const { confirm, Dialog } = useConfirm();

  const editingTrainer = editingTrainerId
    ? trainers.find((t) => t.id === editingTrainerId) || null
    : null;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formDataToSend = new FormData(form);

    const result = await createTrainer({ success: false } as TrainerFormState, formDataToSend) as TrainerFormState;

    if (result.success && result.data) {
      const newTrainer: Trainer = {
        id: result.data.id,
        username: result.data.username || null,
        name: result.data.name,
        createdAt: new Date(),
      };
      setTrainers((prev) => [...prev, newTrainer]);
      setIsCreating(false);
      form.reset();
      toast.success("Entrenador creado exitosamente");
    } else {
      const errorMsg = result.errors?._form?.[0] || result.message || "Error al crear el entrenador";
      toast.error(errorMsg);
    }
  };

  const handleUpdate = async () => {
    if (!editingTrainerId) return;

    const result = await updateTrainer(editingTrainerId, {
      name: formData.name || undefined,
      password: formData.password || undefined,
    });

    if (result.success) {
      setTrainers((prev) =>
        prev.map((t) =>
          t.id === editingTrainerId
            ? { ...t, name: formData.name || t.name }
            : t
        )
      );
      setEditingTrainerId(null);
      setFormData({ name: "", password: "" });
      toast.success("Entrenador actualizado exitosamente");
    } else {
      toast.error(result.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: `¿Eliminar a ${name}?`,
      description: "El entrenador dejará de tener acceso al panel de administración. Esta acción no se puede deshacer.",
      variant: "destructive",
      confirmText: "Eliminar",
    });
    if (!confirmed) return;

    const result = await deleteTrainer(id);

    if (result.success) {
      setTrainers((prev) => prev.filter((t) => t.id !== id));
      if (editingTrainerId === id) {
        setEditingTrainerId(null);
      }
      toast.success("Entrenador eliminado exitosamente");
    } else {
      toast.error(result.message);
    }
  };

  const startEditing = (trainer: Trainer) => {
    setEditingTrainerId(trainer.id);
    setFormData({ name: trainer.name, password: "" });
  };

  const cancelEditing = () => {
    setEditingTrainerId(null);
    setFormData({ name: "", password: "" });
  };

  return (
    <div className="container py-8">
      <PageHeader
        title="Entrenadores"
        description="Gestiona los entrenadores del gimnasio"
        actions={
          !isCreating && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Nuevo Entrenador
            </Button>
          )
        }
      />

      {/* Create Form */}
      {isCreating && (
        <AdminCard variant="standard" className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Crear Nuevo Entrenador
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  DNI (usuario)
                </label>
                <Input
                  name="username"
                  placeholder="12345678"
                  pattern="\d{7,8}"
                  title="DNI de 7-8 dígitos"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Nombre completo
                </label>
                <Input
                  name="name"
                  placeholder="Juan Pérez"
                  minLength={2}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Contraseña
                </label>
                <Input
                  name="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Crear Entrenador</Button>
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </AdminCard>
      )}

      {/* Trainers List */}
      <AdminCard variant="standard">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Entrenadores Existentes ({trainers.length})
          </h3>
        </div>

        <div className="p-4">
          {trainers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No hay entrenadores registrados
            </p>
          ) : (
            <div className="space-y-4">
              {trainers.map((trainer) => (
                <div
                  key={trainer.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  {editingTrainerId === trainer.id ? (
                    // Edit mode
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1 block">
                            Nombre
                          </label>
                          <Input
                            value={formData.name}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="Nombre completo"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1 block">
                            Nueva Contraseña (opcional)
                          </label>
                          <Input
                            type="password"
                            value={formData.password}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, password: e.target.value }))
                            }
                            placeholder="Dejar vacío para no cambiar"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdate}>
                          Guardar
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {trainer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{trainer.name}</p>
                            <p className="text-sm text-muted-foreground">
                              @{trainer.username} • Creado el {new Date(trainer.createdAt).toLocaleDateString("es-AR")}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEditing(trainer)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(trainer.id, trainer.name)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminCard>

      {Dialog}
    </div>
  );
}