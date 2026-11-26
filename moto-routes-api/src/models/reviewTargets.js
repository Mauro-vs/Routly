// Lo que se puede valorar con una opinión (targetType). Las rutas no: su nota es la de las
// experiencias que la usan (services/rating.service.js). Es el único sitio donde se definen: los
// usan el modelo, el esquema de Zod y el service.
export const REVIEW_TARGETS = Object.freeze({
  EXPERIENCE: "experience",
  HOST: "host",
});

export const REVIEW_TARGET_TYPES = Object.freeze(Object.values(REVIEW_TARGETS));
