export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  expert: 'Experto',
};

export interface EmergencyContact {
  name: string;
  phone: string;
}

/** Datos extendidos de un usuario. Llegan dentro de él: el front nunca crea ni borra un perfil. */
export interface Profile {
  bio?: string;
  phone?: string;
  city?: string;
  /** Solo el día, a las 00:00 UTC. */
  birthDate?: string;
  experienceLevel?: ExperienceLevel;
  emergencyContact?: EmergencyContact;
}

/** Lo que se envía. Con `null`, la API vacía el campo. */
export type ProfilePayload = {
  [Key in keyof Profile]?: Profile[Key] | null;
};

// Los mismos límites que src/models/profile.model.js en la API.
export const PROFILE_LIMITS = {
  bio: 500,
  phone: 16,
  city: 100,
  contactName: 100,
  minAge: 14,
} as const;

/** Formato internacional: "+34600111222", de 8 a 15 dígitos. */
export const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
