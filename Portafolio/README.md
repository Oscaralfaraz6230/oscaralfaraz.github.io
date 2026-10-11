# Óscar Alfaraz Bernal — Programador Full Stack

Portfolio estático en HTML, CSS y módulos JavaScript nativos. No necesita instalación de dependencias ni proceso de build; se puede ejecutar con Live Server desde `index.html`.

## Estructura

```text
index.html                         Adaptador de vista y contenido del portfolio
assets/css/portfolio.css           Estilos de presentación
assets/textures/                   Texturas locales de alta resolución
src/main.js                        Composition root de la aplicación
src/domain/                        Contenido y modelos del dominio
src/application/ports/             Contratos de entrada/salida
src/application/use-cases/          Casos de uso
src/infrastructure/adapters/        Repositorio estático y escena Three.js
src/presentation/                   Controladores de interacción de la vista
```

## Flujo de ejemplos

`CodeExamplesController` solicita los ejemplos al caso de uso `GetCodeExamples`. Este depende del puerto `CodeExamplesRepository`, implementado por `StaticCodeExamplesRepository`, que entrega el contenido definido en el dominio. La vista solo presenta el resultado y envía acciones al controlador.

La escena Three.js se mantiene como adaptador de infraestructura y recibe la librería desde `main.js`. El HTML es la vista estática; no importa infraestructura ni contiene controladores inline. La demostración técnica ilustra el recorrido de React a una API REST y un endpoint Spring Boot, y no representa un proyecto de producción adicional.