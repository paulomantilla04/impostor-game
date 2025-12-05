# 🕵️ Impostor - Social Deduction Game

Un juego multijugador en tiempo real de deducción social inspirado en *Spyfall* y *Among Us*. Encuentra al impostor antes de que se mezcle con los demás, o engaña a todos si tú eres el impostor.

Construido con **Next.js 15**, **Convex** (para backend en tiempo real), **Tailwind CSS** y **Shadcn UI**.

## ✨ Características

* **Multijugador en Tiempo Real:** Sincronización instantánea de estados del juego usando Convex.
* **Sistema de Salas:** Crea o únete a salas privadas mediante códigos de 4-6 letras.
* **Múltiples Modos de Juego:**
    * *Clásico:* 1 Impostor.
    * *Doble Agente:* 2 Impostores (para grupos grandes).
    * *Modo Silencio:* Solo se permite usar emojis para comunicarse.
    * *Roles Secretos:* Incluye roles como Detective y Payaso.
* **Categorías Variadas:** Animales, Películas, Comida, Lugares, Deportes y más.
* **Interfaz Moderna:** Diseño "Dark Gaming Aesthetic" con animaciones fluidas usando Framer Motion.
* **Diseño Responsivo:** Juega desde el móvil o escritorio.

---

## 📸 Capturas de Pantalla

A continuación se muestra el flujo del juego.

### 1. Pantalla de Inicio
Aquí los usuarios pueden crear una nueva sala o unirse a una existente.
<img width="1887" height="884" alt="image" src="https://github.com/user-attachments/assets/6944cb62-a877-4e81-ad66-3184b6f769e7" />


### 2. Sala de Espera (Lobby)
El anfitrión configura el juego (categoría, modo, tiempo) mientras los jugadores se unen.
<img width="1462" height="848" alt="image" src="https://github.com/user-attachments/assets/dd72a152-bbdd-46c3-80fe-77294a77ce9f" />


### 3. Tablero de Juego (Rol Ciudadano vs Impostor)
El ciudadano ve la palabra secreta. El impostor ve un aviso de que debe disimular.
<img width="1176" height="896" alt="image" src="https://github.com/user-attachments/assets/d82c8ddb-5558-48af-9c5a-1fcdcb2e9355" />
<img width="1125" height="824" alt="image" src="https://github.com/user-attachments/assets/963ba831-2bd7-4fd0-812a-f3b05723b923" />


### 4. Fase de Votación
Los jugadores votan por quién creen que es el impostor.
<img width="864" height="727" alt="image" src="https://github.com/user-attachments/assets/07dfe2a3-b5f6-4c1b-a891-91f996cf12dd" />


### 5. Resultados
Se revela el ganador y la identidad de los impostores.
<img width="925" height="892" alt="image" src="https://github.com/user-attachments/assets/25eac5dd-5bf9-49f3-930d-74ff787ff2f7" />


---

## 🛠️ Tecnologías Usadas

* **Frontend:** [Next.js 15](https://nextjs.org/) (App Router), React 19.
* **Backend & Base de Datos:** [Convex](https://www.convex.dev/) (BaaS Real-time).
* **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/).
* **Componentes UI:** [Shadcn/ui](https://ui.shadcn.com/) (Radix UI).
* **Animaciones:** [Framer Motion](https://www.framer.com/motion/).
* **Iconos:** Lucide React.

---

## 🚀 Instalación y Configuración

Sigue estos pasos para correr el proyecto localmente.

### Prerrequisitos
* Node.js 18+ o Bun.
* Una cuenta en Convex.dev.

### Pasos

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/paulomantilla04/impostor-game.git
    cd impostor-game
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    # o
    bun install
    ```

3.  **Configurar Convex:**
    Inicia el servidor de desarrollo de Convex. Esto te pedirá loguearte y creará un proyecto en tu dashboard.
    ```bash
    npx convex dev
    ```

4.  **Iniciar el servidor de desarrollo de Next.js:**
    En una nueva terminal (manteniendo `npx convex dev` corriendo):
    ```bash
    npm run dev
    # o
    bun dev
    ```

5.  **¡Jugar!**
    Abre [http://localhost:3000](http://localhost:3000) en tu navegador. Para probar el multijugador localmente, abre varias pestañas o ventanas en modo incógnito.

---

## 🎮 Cómo Jugar

1.  **Inicio:** Un jugador crea la sala y comparte el código.
2.  **Roles:** Al iniciar, el sistema asigna aleatoriamente quién es el **Impostor** y quiénes son los **Ciudadanos**.
3.  **La Palabra:** Todos los ciudadanos reciben la misma palabra secreta (ej. "Pizza"). El Impostor NO recibe la palabra, solo ve la categoría (ej. "Comida").
4.  **Turnos:** Por turnos, cada jugador debe decir una palabra o frase relacionada con la palabra secreta.
    * *Ciudadanos:* Deben ser lo suficientemente específicos para demostrar que saben la palabra, pero lo suficientemente vagos para no regalársela al impostor.
    * *Impostor:* Debe escuchar a los demás e intentar encajar con una palabra que tenga sentido, o deducir cuál es la palabra secreta.
5.  **Votación:** Al acabar el tiempo o las rondas, se vota para eliminar a alguien.
6.  **Victoria:**
    * Los Ciudadanos ganan si eliminan al Impostor.
    * El Impostor gana si no es eliminado y quedan igual número de impostores que ciudadanos, o si el modo de juego lo permite (ej. Payaso).

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Siéntete libre de usarlo y modificarlo.
