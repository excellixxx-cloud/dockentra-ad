# Dockentra motion — Remotion

Основной движок видео Dockentra. Каждая сцена — React-компонент Remotion.
Стек прежний: Node + headless Chromium + ffmpeg (ffmpeg встроен в Remotion).

- **Remotion 4.0.529** — композиции, `useCurrentFrame`, `interpolate` / `Easing`, `<Sequence>`, рендер.
- **GSAP 3.15** — траектории иконок: дуги (у x и y разные ease), overshoot 1.05→1.0, `elastic.out`,
  падение. Таймлайн создаётся `paused` и на каждом кадре переводится в `frame / fps` через `seek`,
  поэтому кадры детерминированы и одинаковы во всех воркерах рендера.
- **Lottie:** `lottie-react` поставлен по запросу. Внутри композиций нужно использовать `@remotion/lottie`:
  он синхронизирует Lottie с кадром. `lottie-react` проигрывает анимацию в реальном времени, и при рендере
  кадры выйдут рваными.

## Команды

```bash
npm ci
npm run fonts     # скачать Manrope / Inter / IBM Plex Mono с Google Fonts CDN в public/fonts
npm run music     # синтезировать оба трека + акценты, −17 LUFS (нужны numpy и imageio-ffmpeg)
npm run studio    # живой превью-редактор
npm run render:creator          # 29.09 «Creator samples» → out/dockentra-creator-samples-2909.mp4
npm run render:creator-frozen   # тот же ролик с замороженной камерой (для приёмки)
npm run check:creator           # чек-лист dockentra-motion по обоим рендерам
npm run render                  # 28.09 «Same order, three ways»
npm run check
npm run smoke     # минимальный пример HelloDockentra
```

Chromium для рендера — локальный (`remotion.config.ts`, по умолчанию headless shell из
`/opt/pw-browsers`; переопределяется через `REMOTION_BROWSER_EXECUTABLE`), чтобы Remotion не скачивал свой.
Шрифты завендорены в `public/fonts`, потому что браузер Remotion во время рендера не ходит в сеть. Источник —
Google Fonts CDN, URL каждого файла записан в `public/fonts/manifest.json`.

## Структура

| Файл | Что внутри |
|---|---|
| `src/brand.ts` | палитра Brand Book v2.0, `EASE_APPEAR` (.22,1,.36,1), `EASE_MOVE` (.4,0,.2,1), stagger 75 мс |
| `src/time.ts` | окна сцен и общий контекст времени (общие элементы живут поверх границ сцен) |
| `src/components/Background.tsx` | две точечные сетки Dock Green с разной скоростью — параллакс |
| `src/components/Kinetic.tsx` | слова по одному, дрейф текста, `MorphTitle` (заголовок стирается и перепечатывается между сценами), чипы-конвейер, ✓/✗ со штриховой прорисовкой |
| `src/components/IconStage.tsx` | GSAP-таймлайн всех иконок: общий элемент на весь ролик |
| `src/components/Subtitles.tsx` | karaoke-субтитры: слова подсвечиваются по порядку, старая строка выталкивается вверх |
| `src/scenes/Scenes.tsx` | Hook · Polybag · Mailer · Box · Recap · Question · EndCard |
| `scripts/checklist.py` | автоматический чек-лист приёмки |

## Приёмка «Same order, three ways» (`npm run check`)

```
[PASS] Hard rule: no frame unchanged > 1 s          — самый длинный стоп 0.37 s (пауза на 27 s по сценарию)
[PASS] 1. Motion visible in every segment           — движение в 70–100 % кадров каждого сегмента
[PASS] 2. 5 random timecodes: >= 4/5 mid-animation  — 5/5; по всем кадрам 93 %
[PASS] 3. Pattern interrupt                         — жёсткая склейка 20.00 s (удар коробки + тряска), раскрытие финала 34.40 s
[PASS] 4. More than one easing profile              — 13 профилей
[PASS] 5. Palette and logo                          — только 5 цветов бренда; логотип 600 мс @ 34.5 s, на экране последние 1.5 s
[PASS] Prohibited: text motionless > 2 s            — максимум 1.33 s
[PASS] Subtitles not mint, >= 240 px from bottom    — 320 px, 0 мятных пикселей
```

Пункты 1–2 в скрипте проверяются по пикселям. Он считает, где меняется передний план (текст, иконки, субтитры),
и дрейф фона не засчитывает как движение. Просмотр на 0.25x человеком это не заменяет.

## 29.09 «Creator samples» — Overhead, 38 с

`src/creator/`: `Objects.tsx` (коробка → сэмпл, мейлер, бирка, видоискатель, иконки 2px),
`timeline.ts` (все траектории на одном GSAP-таймлайне), `CreatorSamples.tsx` (стол, камера, слои, текст).

- **Стол:** Bay Grey, точечная фактура и метки, мятная кромка по верху. Это единственный мятный элемент,
  поэтому ключевые слова набраны Dock Green.
- **Камера и параллакс:** дрейф на синусоидах, наезд на коробку 14–15 с и отъезд 22,6 с, удар с тряской на рывке.
  Стол движется со скоростью 85 % от объектов, слой текста — 108 %.
- **Непрерывные переходы:** стопки, счётчики, разделитель и коробка-герой живут через весь ролик. Коробка
  превращается в сэмпл (инвойс уезжает, ценник срывается, углы смягчаются, заливка Dock Green, лента →
  бандероль, бирка, видоискатель) и перелетает в стопку сэмплов. Бирки собираются в стопку,
  стопка раскладывается в 50 плиток, плитки схлопываются в точку, из которой заливается логотип.
- **Pattern interrupt (26,0 с):** стопка бирок за 2 кадра вырастает с 6 до 50, камера бьёт и трясётся.
  Перед ударом музыка проседает.

### Приёмка (`npm run check:creator`) — 9/9

Движение проверяется дважды: на финальном рендере и на рендере с замороженной камерой.
Так дрейф кадра не может «вытянуть» статичную сцену.

```
[PASS] Hard rule: no frame unchanged > 1 s      final 0.80 s · camera frozen 0.80 s (финальная выдержка логотипа)
[PASS] 1. 0.25x — motion in every segment       5 сегментов: 72–100 % кадров в движении даже без камеры
[PASS] 2. 5 random pauses >= 4/5 moving         5/5 (camera-frozen); всего в движении 96 % / 85 % кадров
[PASS] 3. Pattern interrupt, the only hard cut  26.07 s; других резких склеек нет
[PASS] 4. >1 easing, no linear                  11 профилей, linear: 0
[PASS] 5. Colours, fonts, logo                  только 5 цветов бренда, 0 пикселей чужого оттенка, мят только у кромки,
                                                Manrope/Inter/IBM Plex Mono, логотип 600 мс @ 36.5 s, последние 1.5 s
[PASS] Text never still > 2 s                   текст 0.23 s, субтитры 1.80 s
[PASS] Subtitles not mint, >= 240 px            320 px
[PASS] Parallax >= 5 %                          стол 85 %, текст 108 %
```
