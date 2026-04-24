# 🩹 PARCHE v2.0 — DnD Discord Bot

## ✅ Cambios incluidos en este parche

### 1. ⏱️ Eliminado el timer de 2 minutos
- El bot **ya no avanza automáticamente** a los 2 minutos.
- Ahora espera a que **todos los participantes respondan**.
- Cuando el último jugador responde, aparece un **botón "▶️ Continuar aventura"** para que cualquier jugador lo presione y se resuelva la escena.

### 2. 🛑 Nuevos comandos de control de aventura
| Comando | Descripción |
|---|---|
| `/terminar_aventura` | Cancela la aventura activa en el canal sin recompensas |
| `/reiniciar_aventura` | Reinicia la aventura desde el nodo inicial conservando a los jugadores |

### 3. 📋 Tablón de Misiones (`/mision`)
Misiones pequeñas que **puede hacer incluso una sola persona**.

| Subcomando | Descripción |
|---|---|
| `/mision ver` | Ver misiones disponibles para tu nivel (con filtro de dificultad) |
| `/mision iniciar <ID>` | Iniciar una misión por su ID |
| `/mision estado` | Ver el estado de la misión activa en el canal |
| `/mision abandonar` | Abandonar la misión activa |

**8 misiones incluidas** en 4 niveles de dificultad:
| Dificultad | Nivel | Jugadores |
|---|---|---|
| 🟢 Fácil | 1 | 1 persona |
| 🟡 Normal | 1-2 | 1-3 personas |
| 🔴 Difícil | 2-3 | 2-4 personas |
| 🟣 Épico | 4-5 | 3-5 personas |

Cada misión tiene **recompensas de XP y oro**, y algunas tienen **loot especial** con probabilidad aleatoria.

### 4. 📖 Sistema de hechizos progresivos (`/hechizos`)
Cada clase aprende nuevas habilidades y hechizos al **subir de nivel** (del 1 al 10).

| Clase | Habilidades notables |
|---|---|
| ⚔️ Guerrero | Segundo Viento, Impulso de Acción, Ataque Extra, Inquebrantable |
| 🔮 Mago | Dardo Mágico → Bola de Fuego → Desintegrar → Lluvia de Meteoros |
| 🗡️ Pícaro | Ataque Furtivo → Asesinar → Paso de Sombra → Golpe Mortal |
| ✨ Clérigo | Curar Heridas → Revivir → Columna de Llamas → Aura Sagrada |
| 🏹 Arquero | Marca del Cazador → Lluvia de Flechas → Flecha de Relámpago |
| 🪓 Bárbaro | Furia → Ataque Temerario → Tótem del Oso → Agarre Titánico |

---

## 📁 Archivos modificados/añadidos

```
src/
├── index.js                        ← MODIFICADO (botones nuevos)
├── commands/
│   ├── deploy.js                   ← MODIFICADO (registrar nuevos comandos)
│   ├── terminar_aventura.js        ← NUEVO
│   ├── reiniciar_aventura.js       ← NUEVO
│   ├── mision.js                   ← NUEVO
│   └── hechizos.js                 ← NUEVO
├── data/
│   ├── classes.js                  ← MODIFICADO (árbol de hechizos)
│   └── missions.js                 ← NUEVO (8 misiones)
├── models/
│   ├── Character.js                ← MODIFICADO (checkLevelUp con hechizos)
│   └── MissionSession.js           ← NUEVO
└── utils/
    └── sessionManager.js           ← MODIFICADO (sin timer, botón continuar)
```

---

## 🚀 Cómo aplicar el parche

### Opción A — Reemplazar archivos manualmente

1. Reemplaza `src/index.js` con el del parche
2. Reemplaza `src/utils/sessionManager.js`
3. Reemplaza `src/data/classes.js`
4. Reemplaza `src/models/Character.js`
5. Añade los archivos nuevos:
   - `src/data/missions.js`
   - `src/models/MissionSession.js`
   - `src/commands/terminar_aventura.js`
   - `src/commands/reiniciar_aventura.js`
   - `src/commands/mision.js`
   - `src/commands/hechizos.js`
6. Reemplaza `src/commands/deploy.js`

### Opción B — Git patch

```bash
git clone https://github.com/TU_USUARIO/dnd-bot.git
cd dnd-bot
# Copiar los archivos del parche a las rutas correspondientes
git add .
git commit -m "Parche v2.0: sin timer, tablón misiones, hechizos por nivel"
git push
```

### Paso final — Registrar los nuevos comandos

Después de subir los cambios, ejecuta **una sola vez**:

```bash
node src/commands/deploy.js
```

Verás:
```
✅ Comandos registrados exitosamente.
Nuevos comandos añadidos:
  /terminar_aventura
  /reiniciar_aventura
  /mision ver|iniciar|estado|abandonar
  /hechizos
```

---

## ⚠️ Notas importantes

- El parche **es compatible hacia atrás** — los personajes existentes en MongoDB no se borran.
- El nuevo `Character.js` añade campos (`spellSlots`, `newSpells`) que se crearán automáticamente en documentos existentes con Mongoose.
- Si usas el modelo `Session.js` original, asegúrate de que tenga los campos `pendingResponses` y `responses` — si no los tiene, agrégalos o usa el `Session.js` del parche (compatible).
- El **tablón de misiones** usa su propio modelo `MissionSession` separado de las aventuras principales para no interferir.
