"use client";

import { Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { subscribePointer, type PointerState } from "@/hooks/use-pointer";

/**
 * Campo de ondas em WebGL, atrás do hero.
 *
 * É o GradientWaves do React Bits — desta vez o pacote de verdade, não só a
 * ideia. A diferença em relação ao LightPillar, que virou CSS: aquele pedia
 * three.js (~150 KB gzip); este pede `ogl`, que no caminho crítico (Renderer,
 * Program, Mesh, Triangle) dá cerca de um décimo disso. A conta fechou dentro
 * do orçamento da SPEC 10, e por isso ele existe como shader.
 *
 * Cinco coisas mudaram em relação ao componente original, e cada uma é uma
 * regra do CLAUDE.md:
 *
 * 1. **As cores saem dos tokens** (regra 5). O original é violeta #5227FF com
 *    rosa #FF9FFC — quase a nossa paleta por coincidência, mas coincidência
 *    não é token. Aqui o horizonte é `--color-bg`, para as ondas dissolverem
 *    no fundo da página em vez de terminarem numa borda; o corpo é
 *    `--color-brand-bright`, que existe exatamente para brilho e gradiente e
 *    nunca fica atrás de texto; e a crista é o selênio da paleta. Sobre creme
 *    profundidade se lê por saturação, não por luminosidade — é a mesma razão
 *    pela qual a crista aqui é mais ESCURA que o corpo, ao contrário do
 *    original, que desenhava sobre preto.
 *
 * 2. **Nenhum listener novo de ponteiro** (regra 3). O original põe um
 *    `pointermove` no próprio canvas. A aplicação tem exatamente um, no driver
 *    de `use-pointer`, e a `/dev/motion` afirma isso (`listeners → 1`). Aqui a
 *    parallaxe assina o driver existente.
 *
 * 3. **`prefers-reduced-motion` desliga o laço** (regra 14). Não apaga o
 *    efeito: desenha **um quadro** e para. Quem pediu menos movimento pediu
 *    menos movimento, não uma página em branco — e um quadro parado é um
 *    estado em repouso válido.
 *
 * 4. **O custo cai no celular.** Um raymarch de tela cheia é caro por pixel, e
 *    o preço é bateria de gente que está no 4G. Abaixo de 768px o passo cai
 *    para o nível `low` (40 iterações contra 70) e o dpr é limitado a 1,5 em
 *    vez de 2 — junto, cerca de um terço do trabalho por quadro.
 *
 * 5. **Sem WebGL2 ele não nasce.** Os shaders são `#version 300 es`; com o
 *    fallback WebGL1 do ogl eles não compilam e o console enche de erro. Se o
 *    contexto não vier, o componente devolve a tela ao gradiente de CSS que
 *    está atrás dele.
 *
 * Ele SUBSTITUI o pilar de luz que morava atrás do mascote, não soma com ele:
 * o hero já tinha a safelight mais o pilar, que é o teto de dois efeitos
 * ambientais. E os dois eram gradiente rosa-violeta na mesma dobra — somados,
 * viravam mancha.
 */

const VERTEX = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaveScale;
uniform float uWaveRatio;
uniform float uSwell;
uniform float uTurbulence;
uniform float uTilt;
uniform float uZoom;
uniform float uHeight;
uniform float uFogDepth;
uniform float uSteps;
uniform float uBrightness;
uniform float uOpacity;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec2 uMouse;
uniform float uParallax;
uniform bool uEnableMouse;
uniform vec3 uHorizonColor;
uniform vec3 uWaveColor;
uniform vec3 uCrestColor;
out vec4 fragColor;

const float MAX_DIST = 20000.0;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float plasma(vec3 r, vec2 freq, vec4 tc) {
  float mx = r.x + tc.x;
  mx += uSwell * sin((r.y + mx) / 20.0 + tc.y);
  float my = r.y - tc.z;
  my += uTurbulence * cos(r.x / 23.0 + tc.w);
  return r.z - (sin(mx * freq.x) * uAmplitude + sin(my * freq.y) * uAmplitude + uHeight);
}

float raymarch(vec3 pos, vec3 dir, vec2 freq, vec4 tc) {
  float dist = 0.0;
  for (int i = 0; i < 128; i++) {
    if (float(i) >= uSteps) break;
    float dscene = plasma(pos + dist * dir, freq, tc);
    if (abs(dscene) < 0.1) break;
    dist += 0.9 * dscene;
    if (!(abs(dist) < MAX_DIST)) return MAX_DIST;
  }
  return dist;
}

void main() {
  float T = iTime * uSpeed;
  vec2 freq = vec2(uWaveScale / 7.0, (uWaveScale * uWaveRatio) / 3.0);
  vec4 tc = vec4(T / 0.130, T / 0.810, T / 0.200, T / 0.710);
  float c, s;
  float vfov = (3.14159 / 2.3) / max(uZoom, 0.05);
  vec3 cam = vec3(0.0, 0.0, 30.0);
  vec2 uv = (gl_FragCoord.xy / iResolution.xy) - 0.5;
  uv.x *= iResolution.x / iResolution.y;
  uv.y *= -1.0;

  vec3 dir = vec3(0.0, 0.0, -1.0);
  float ulen = length(uv);
  float xrot = vfov * ulen;
  c = cos(xrot); s = sin(xrot);
  dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
  vec2 nuv = ulen > 1e-5 ? uv / ulen : vec2(1.0, 0.0);
  c = nuv.x; s = nuv.y;
  dir = mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0) * dir;
  c = cos(uTilt); s = sin(uTilt);
  dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;

  if (uEnableMouse) {
    float yaw = (uMouse.x - 0.5) * uParallax * 0.4;
    float pitch = (uMouse.y - 0.5) * uParallax * 0.4;
    c = cos(yaw); s = sin(yaw);
    dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;
    c = cos(pitch); s = sin(pitch);
    dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
  }

  float dist = raymarch(cam, dir, freq, tc);
  vec3 pos = cam + dist * dir;

  float t = clamp(uFogDepth / max(dist, 0.001), 0.0, 1.0);
  vec3 body = mix(uWaveColor, uCrestColor, clamp(pos.z * 0.08 + 0.5, 0.0, 1.0));
  vec3 col = mix(uHorizonColor, body, t);
  col *= uBrightness;
  col = clamp(col, 0.0, 1.0);

  float alpha = clamp(t, 0.0, 1.0) * uOpacity;
  if (uGrain > 0.5) {
    float g = hash21(gl_FragCoord.xy + mod(iTime, 64.0) * 11.0);
    alpha += (g - 0.5) * uGrainIntensity;
  }
  alpha = clamp(alpha, 0.0, 1.0);
  fragColor = vec4(col * alpha, alpha);
}
`;

/**
 * Lê um token de cor e devolve 0..1 por canal.
 *
 * Os tokens guardam `R G B` sem vírgula, porque o CSS os consome dentro de
 * `rgb(var(--token) / alfa)`. Se o token não existir, a cor volta branca — que
 * some no fundo em vez de pintar algo fora da identidade.
 */
function tokenToRgb(styles: CSSStyleDeclaration, token: string): Float32Array {
  const raw = styles.getPropertyValue(token).trim();
  const [r, g, b] = raw.split(/[\s,]+/).map(Number);

  if (
    r === undefined ||
    g === undefined ||
    b === undefined ||
    Number.isNaN(r) ||
    Number.isNaN(g) ||
    Number.isNaN(b)
  ) {
    return new Float32Array([1, 1, 1]);
  }

  return new Float32Array([r / 255, g / 255, b / 255]);
}

export function GradientWaves({ className = "" }: { className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = container.current;
    if (!node) return;

    // Sem WebGL2 os shaders `#version 300 es` não compilam. Melhor não nascer
    // do que encher o console e deixar um canvas transparente por cima.
    const prova = document.createElement("canvas");
    if (!prova.getContext("webgl2")) return;

    const estreito = window.matchMedia("(max-width: 767px)").matches;

    const renderer = new Renderer({
      webgl: 2,
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, estreito ? 1.5 : 2),
    });

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    node.appendChild(canvas);

    const styles = getComputedStyle(node);

    const program = new Program(gl, {
      vertex: VERTEX,
      fragment: FRAGMENT,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uSpeed: { value: 0.26 },
        uAmplitude: { value: 2.5 },
        uWaveScale: { value: 0.6 },
        uWaveRatio: { value: 0.9 },
        uSwell: { value: 35 },
        uTurbulence: { value: 20 },
        uTilt: { value: 1.11 },
        uZoom: { value: 1 },
        uHeight: { value: 5.5 },
        // 60, e não os 15 do original. Este é O parâmetro do componente, e o
        // padrão dele foi calibrado para fundo preto. `t = fogDepth / dist`
        // decide o quanto cada pixel é onda e o quanto é horizonte — e o
        // horizonte aqui é a cor da própria página. Com 15, quase todo o campo
        // caía do lado "longe" da conta: o shader rodava, gastava bateria e
        // pintava a página de branco sobre branco. Medido em `/ondas-teste`:
        // 15 é invisível, 90 engole o texto, 60 deixa o topo limpo para o h1 e
        // a cor densa embaixo.
        uFogDepth: { value: 60 },
        // 40 contra 70 iterações: o custo por pixel de um raymarch é o produto
        // direto disto, e no celular ele vira calor e bateria.
        uSteps: { value: estreito ? 40 : 70 },
        uBrightness: { value: 1 },
        // A máscara de CSS é quem mantém as ondas longe do texto — aqui elas
        // podem ser densas, porque onde elas são densas não há o que ler.
        uOpacity: { value: 0.92 },
        uGrain: { value: 1 },
        uGrainIntensity: { value: 0.04 },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uParallax: { value: 0.4 },
        uEnableMouse: { value: !estreito },
        uHorizonColor: { value: tokenToRgb(styles, "--color-bg") },
        uWaveColor: { value: tokenToRgb(styles, "--color-brand-bright") },
        uCrestColor: { value: tokenToRgb(styles, "--palette-selenio") },
      },
    });

    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const medir = () => {
      const rect = node.getBoundingClientRect();
      renderer.setSize(
        Math.max(1, Math.floor(rect.width)),
        Math.max(1, Math.floor(rect.height)),
      );
      const res = program.uniforms.iResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      renderer.render({ scene: mesh });
    };

    const ro = new ResizeObserver(medir);
    ro.observe(node);
    medir();

    // Movimento reduzido: um quadro e ponto. A cor fica, o movimento não.
    if (reduced) {
      return () => {
        ro.disconnect();
        node.removeChild(canvas);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    }

    // A parallaxe assina o driver único. Nada de listener próprio (regra 3).
    let alvoX = 0.5;
    let alvoY = 0.5;
    let suaveX = 0.5;
    let suaveY = 0.5;
    const desassinar = subscribePointer((estado: PointerState) => {
      alvoX = estado.nx;
      alvoY = 1 - estado.ny;
    });

    let raf = 0;
    let naTela = true;
    let abaVisivel = !document.hidden;
    const t0 = performance.now();

    const quadro = (t: number) => {
      program.uniforms.iTime.value = (t - t0) * 0.001;
      // Interpolação de 5% por quadro: o cursor manda, mas a câmera chega
      // atrasada. Sem isso a parallaxe salta junto com o ponteiro e o efeito
      // lê como falha, não como profundidade.
      suaveX += 0.05 * (alvoX - suaveX);
      suaveY += 0.05 * (alvoY - suaveY);
      const m = program.uniforms.uMouse.value as Float32Array;
      m[0] = suaveX;
      m[1] = suaveY;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(quadro);
    };

    const tocar = () => {
      if (naTela && abaVisivel && raf === 0) raf = requestAnimationFrame(quadro);
    };
    const parar = () => {
      if (raf === 0) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // Fora da tela ou em aba escondida ele não desenha: um raymarch rodando
    // para ninguém é bateria gasta para ninguém.
    const io = new IntersectionObserver(
      (entradas) => {
        naTela = entradas.some((entrada) => entrada.isIntersecting);
        if (naTela) tocar();
        else parar();
      },
      { threshold: 0 },
    );
    io.observe(node);

    const aoTrocarAba = () => {
      abaVisivel = !document.hidden;
      if (abaVisivel) tocar();
      else parar();
    };
    document.addEventListener("visibilitychange", aoTrocarAba);

    tocar();

    return () => {
      parar();
      desassinar();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", aoTrocarAba);
      node.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [reduced]);

  return (
    <div
      ref={container}
      aria-hidden
      className={`gradient-waves ${className}`.trim()}
    />
  );
}
