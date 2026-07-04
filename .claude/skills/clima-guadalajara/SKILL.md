---
name: clima-guadalajara
description: Obtiene y reporta el clima actual de Guadalajara, Jalisco, México (temperatura, sensación térmica, condición y humedad). Úsala cuando el usuario pida el clima, la temperatura o una actualización meteorológica de Guadalajara.
---

# Clima de Guadalajara

Reporta el clima actual de Guadalajara, Jalisco, México usando `WebFetch` contra `wttr.in` (no requiere API key).

## Pasos

1. Llama a `WebFetch` con:
   - `url`: `https://wttr.in/Guadalajara,Jalisco,Mexico?format=j1`
   - `prompt`: "Extrae la temperatura actual en Celsius, la sensación térmica, la condición del clima (descripción en texto) y la humedad relativa. Confirma también el nombre de la ubicación que reporta y la hora de observación."

   **Importante:** usa siempre `Guadalajara,Jalisco,Mexico` como ubicación, nunca solo `Guadalajara` — `wttr.in` puede resolver el nombre ambiguo a Guadalajara, España, en vez de la ciudad en Jalisco, México. Verifica en la respuesta que la ubicación mencione "Jalisco" o "México"; si no, repite la consulta con la URL completa.

2. Si `WebFetch` falla o no responde, usa `WebSearch` con la consulta `clima Guadalajara Jalisco México ahora` como respaldo.

3. Presenta el resultado en español, de forma breve, con este formato:

   ```
   Clima en Guadalajara, Jalisco:
   - 🌡️ Temperatura: X°C
   - 🥵 Sensación térmica: X°C
   - ☁️ Condición: <traducida al español>
   - 💧 Humedad: X%
   ```

4. `WebFetch` tiene una caché interna de ~15 minutos. Si la hora de observación devuelta es idéntica a una consulta anterior reciente, acláralo brevemente (p. ej. "sin cambios desde la última consulta, dato cacheado") en vez de presentarlo como una lectura nueva.
