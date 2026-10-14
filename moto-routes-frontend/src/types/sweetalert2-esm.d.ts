// SweetAlert2 publica su versión en módulos ES en esta ruta, pero solo declara tipos
// para la entrada principal (CommonJS). Con esta declaración NotificationService
// puede importar la versión ES, que es la que el empaquetador optimiza sin avisos.
declare module 'sweetalert2/dist/sweetalert2.esm.all.js' {
  export * from 'sweetalert2';
  export { default } from 'sweetalert2';
}
