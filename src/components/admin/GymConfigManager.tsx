"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { updateGymField } from "@/app/actions/gym";
import { DumbbellSpinner } from "@/components/ui/dumbbell-spinner";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminFormField } from "@/components/admin/admin-form-field";
import type { FormState, GymDisplay, GymField } from "@/lib/schemas";

/**
 * Per-field FormState — paired with `updateGymField`.
 * `data` carries the saved `{ field, value }` so the manager can resync
 * the input when the action completes.
 */
type FieldFormState = FormState<{ field: GymField; value: string }>;

interface GymConfigManagerProps {
  initial: GymDisplay;
}

/**
 * Admin-only form manager for the singleton Gym record.
 *
 * Phase 3 of the gym-config-admin change — Slice 2 currently wires up
 * the Identity sub-form (nombre). Subsequent commits in this slice
 * add the Schedule, Location, and Social sub-forms.
 *
 * Each sub-form has its own `useActionState` hook + server action call
 * so partial saves don't overwrite siblings with empty strings.
 */
export function GymConfigManager({ initial }: GymConfigManagerProps) {
  return (
    <div className="space-y-6">
      <IdentitySubForm initialValue={initial.nombre} />
    </div>
  );
}

interface SubFormShellProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  errorMessage: string | null;
  success: boolean;
  fieldError: string | null;
  isPending: boolean;
  onSubmit: (formData: FormData) => void;
  children: React.ReactNode;
  saveLabel: string;
}

/**
 * Shared chrome for the four sub-forms (Identity / Schedule / Location /
 * Social). Keeps the visual language consistent and the per-form
 * subcomponents focused on their inputs.
 */
function SubFormShell({
  title,
  description,
  icon,
  errorMessage,
  success,
  fieldError,
  isPending,
  onSubmit,
  children,
  saveLabel,
}: SubFormShellProps) {
  const router = useRouter();

  // Success toast + router refresh on save so the cached reader +
  // revalidated paths resync across the app.
  useEffect(() => {
    if (!isPending && success) {
      toast.success("Configuración actualizada");
      router.refresh();
    }
  }, [isPending, success, router]);

  return (
    <AdminCard variant="standard">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <form action={onSubmit} className="space-y-4">
        {children}

        {errorMessage && !fieldError && (
          <p className="text-destructive text-sm" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <DumbbellSpinner size={16} />
                Guardando...
              </>
            ) : (
              saveLabel
            )}
          </button>
        </div>
      </form>
    </AdminCard>
  );
}

interface IdentitySubFormProps {
  initialValue: string | null;
}

/**
 * Identity sub-form: gym name (`nombre`).
 *
 * Required field, max 80 chars. The server action returns
 * `errors.nombre?.[0]` on failure; we surface it next to the input.
 */
function IdentitySubForm({ initialValue }: IdentitySubFormProps) {
  const [state, formAction, isPending] = useActionState<FieldFormState, FormData>(
    updateGymField,
    { success: false }
  );

  // Server-returned value wins on success, so the input resyncs
  // even after edits in another tab.
  const serverValue = state.success && state.data?.field === "nombre"
    ? state.data.value
    : null;
  const displayedValue = serverValue ?? initialValue ?? "";

  const fieldError = state.errors?.nombre?.[0] ?? null;
  const generalError = !fieldError && !state.success ? state.message ?? null : null;

  return (
    <SubFormShell
      title="Identidad"
      description="Nombre visible del gimnasio."
      icon={<Building2 className="w-5 h-5" />}
      errorMessage={generalError}
      success={state.success}
      fieldError={fieldError}
      isPending={isPending}
      onSubmit={formAction}
      saveLabel="Guardar nombre"
    >
      <input type="hidden" name="field" value="nombre" />
      <AdminFormField
        variant="default"
        label="Nombre del gimnasio"
        error={fieldError ?? undefined}
      >
        <input
          type="text"
          name="value"
          defaultValue={displayedValue}
          key={displayedValue}
          maxLength={80}
          disabled={isPending}
          placeholder="Ej: Gimnasio Norte"
          className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring disabled:opacity-50"
        />
      </AdminFormField>
    </SubFormShell>
  );
}
