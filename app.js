import * as THREE from "three";
import { STLLoader } from "./vendor/STLLoader.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

// ─────────────────────────────────────────────────────────────────────────
// Gruplama SIRAYA değil ÜRÜN TİPİNE bakar: prompt listesine yeni bir satır
// eklendiğinde bölümler kendiliğinden doğru kalsın.
const AILE = [
  ["Tektaş ve kafa", "Kafa formu, taş kesimi, mıhlama tekniği", ["tek-tas", "halo", "uc-tas"]],
  ["Bant ve sıra taş", "Eternity, alyans, mühür", ["eternity", "alyans", "signet"]],
  ["Yüzük dışı", "Bilezik, kolye ucu, küpe", ["bilezik", "kolye-ucu", "kupe"]],
];

// Metal rengi ayara göre. Renkler dökümü değil, GÖRÜNTÜYÜ tanımlar; ölçüm
// dosyasındaki metalId tek doğruluk noktasıdır.
const METAL = {
  "18-beyaz": [0xf0f1f2, "18 ayar beyaz"], "14-beyaz": [0xeef0f1, "14 ayar beyaz"],
  "18-sari": [0xf2cf72, "18 ayar sarı"], "14-sari": [0xf0d48c, "14 ayar sarı"],
  "22-sari": [0xf7c64e, "22 ayar sarı"], "18-rose": [0xecab8a, "18 ayar roze"],
  "14-rose": [0xeeb598, "14 ayar roze"], "925-gumus": [0xeceef0, "gümüş"],
};
const AYAR_ANAHTAR = { 925: "925", 14: "14A", 18: "18A", 22: "22A" };

const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const mb = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

const veri = await (await fetch("./veri.json")).json();

// ─────────────────────────────────────────────────────────────────────────
// Kartlar
function agirlik(o) {
  const anah = AYAR_ANAHTAR[String(o.spec?.metalId ?? "").split("-")[0]] ?? "18A";
  const g = o.gram?.[anah];
  return g ? `${g} g · ${METAL[o.spec?.metalId]?.[1] ?? anah}` : null;
}

function kunye(o) {
  const alan = [];
  if (o.olcu) alan.push(["Ölçü", `TR ${o.olcu}`]);
  if (o.bantGenislikMm) alan.push(["Bant", `${o.bantGenislikMm} × ${o.etKalinlikMm} mm`]);
  if (!o.olcu && o.gabariMm) alan.push(["En × boy", `${o.gabariMm.enMm} × ${o.gabariMm.boyMm} mm`]);
  if (o.tasAdet > 0) alan.push(["Taş", `${o.tasAdet} adet · ${Number(o.toplamKarat).toFixed(2)} ct`]);
  const g = agirlik(o);
  if (g) alan.push(["Ağırlık", g]);
  if (o.kural) alan.push(["Üretim kuralı", `${o.kural.gecen}/${o.kural.toplam}`]);
  alan.push(["Katı", `${o.metalBilesenSayisi === 1 ? "tek parça" : o.metalBilesenSayisi + " parça"}` +
    `${o.manifoldDurumu === "NoError" ? " · su geçirmez" : " · " + o.manifoldDurumu}`]);
  return alan.map(([k, v]) => `<div class="kv"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
}

function indirmeler(s) {
  const sira = [["rhino", "3DM"], ["render", "STL render"], ["dokum", "STL döküm"]];
  return sira.filter(([k]) => s.dosyalar[k]).map(([k, ad]) => {
    const d = s.dosyalar[k];
    return `<a href="./m/${d.ad}" download="orfe-${s.no}-${k}.${d.ad.split(".").pop()}">` +
      `${esc(ad)} <small>${mb(d.bayt)}</small></a>`;
  }).join("");
}

function kart(s) {
  const o = s.olcum;
  const anla = (o.anlasilan ?? []).filter((x) => !/^ürün:/.test(x) && x !== "metal");
  const yans = o.yansimayanSozcukler ?? [];
  const notlar = (o.normalizeNotlari ?? []).filter((n) => !/üretilmiyor/.test(n));
  return `<article class="kart">
  <button class="kapak" data-no="${s.no}" aria-label="${esc(s.prompt)} — 3B incele">
    <img src="./k/${s.no}.jpg" alt="${esc(s.prompt)}" loading="lazy" />
    <span class="rozet">3B incele</span>
  </button>
  <div class="govde">
    <p class="etiket">Yazılan</p>
    <p class="prompt">${esc(s.prompt)}</p>
    ${anla.length ? `<p class="okunan">${anla.map((a) => `<span>${esc(a)}</span>`).join("")}</p>` : ""}
    ${yans.length ? `<p class="uyari"><strong>Tasarıma yansımayan:</strong> ${esc(yans.join(", "))}</p>` : ""}
    ${notlar.length ? `<p class="ayarnot"><strong>Üretim için düzeltildi:</strong> ${esc(notlar.join(" · "))}</p>` : ""}
    <dl class="kunye">${kunye(o)}</dl>
    <div class="indir">${indirmeler(s)}</div>
  </div>
</article>`;
}

const yerlesen = new Set();
document.getElementById("icerik").innerHTML = AILE.map(([ad, not, tipler]) => {
  const uyan = veri.filter((s) => tipler.includes(s.olcum?.spec?.tip));
  uyan.forEach((s) => yerlesen.add(s.no));
  if (!uyan.length) return "";
  return `<section class="bolum"><header class="bolum-bas"><h2>${ad}</h2><p>${not}</p></header>
    <div class="izgara">${uyan.map(kart).join("")}</div></section>`;
}).join("");
// Hiçbir aileye girmeyen tasarım sessizce DÜŞMESİN.
const dusen = veri.filter((s) => !yerlesen.has(s.no));
if (dusen.length) console.warn("aileye girmeyen tasarım:", dusen.map((s) => s.no));

const tekParca = veri.filter((s) => s.olcum.metalBilesenSayisi === 1).length;
const sizdirmaz = veri.filter((s) => s.olcum.manifoldDurumu === "NoError").length;
const anlasilmayan = veri.filter((s) => (s.olcum.yansimayanSozcukler ?? []).length).length;
const saglam = Math.min(tekParca, sizdirmaz);
document.getElementById("sayac").innerHTML = [
  `<b>${veri.length}</b> prompt, <b>${veri.length}</b> tasarım`,
  `<b>${veri.reduce((t, s) => t + (s.olcum.tasAdet ?? 0), 0)}</b> taş mıhlandı`,
  `tasarım başına <b>~${Math.round(veri.reduce((t, s) => t + (s.olcum.sureMs?.toplam ?? 0), 0) / veri.length / 1000)} sn</b>`,
  saglam === veri.length ? "hepsi <b>tek parça · su geçirmez</b>" : `<b>${veri.length - saglam}</b> tasarımda katı kusuru`,
  anlasilmayan === 0 ? "anlaşılmayan sözcük <b>yok</b>" : `<b>${anlasilmayan}</b> promptta anlaşılmayan sözcük`,
].map((x) => `<span>${x}</span>`).join("");

// ─────────────────────────────────────────────────────────────────────────
// 3B görüntüleyici. Sahne bir kez kurulur, model her açılışta değişir.
const perde = document.getElementById("perde");
const sahneKutu = document.getElementById("sahne");
const durum = document.getElementById("p-durum");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
sahneKutu.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 4000);
const kontrol = new OrbitControls(camera, renderer.domElement);
kontrol.enableDamping = true;
kontrol.dampingFactor = 0.08;

// Metal ancak yansıtacak bir ortam varsa metal görünür; HDR dosyası taşımamak
// için three'nin yordamsal oda ortamı PMREM'e pişirilir.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

scene.add(new THREE.HemisphereLight(0xffffff, 0x999a9c, 0.55));
const anaIsik = new THREE.DirectionalLight(0xffffff, 1.9);
anaIsik.position.set(1, 1.6, 1.2);
scene.add(anaIsik);
const dolguIsik = new THREE.DirectionalLight(0xffffff, 0.55);
dolguIsik.position.set(-1.2, 0.4, -1);
scene.add(dolguIsik);

const kok = new THREE.Group();
scene.add(kok);

const yukleyici = new STLLoader();
const onbellek = new Map(); // dosya adı → BufferGeometry

function zeminRengi() {
  return getComputedStyle(document.body).getPropertyValue("--plaka").trim() || "#f8f8f6";
}

async function geometri(ad, ilerle) {
  if (onbellek.has(ad)) return onbellek.get(ad);
  const yanit = await fetch(`./m/${ad}`);
  if (!yanit.ok) throw new Error(`${ad} yüklenemedi (${yanit.status})`);
  const toplam = Number(yanit.headers.get("content-length")) || 0;
  const parcalar = [];
  let alinan = 0;
  const okuyucu = yanit.body.getReader();
  for (;;) {
    const { done, value } = await okuyucu.read();
    if (done) break;
    parcalar.push(value);
    alinan += value.length;
    if (toplam) ilerle?.(alinan / toplam);
  }
  const tampon = new Uint8Array(alinan);
  let ofs = 0;
  for (const p of parcalar) { tampon.set(p, ofs); ofs += p.length; }
  const geo = yukleyici.parse(tampon.buffer);
  geo.computeVertexNormals();
  onbellek.set(ad, geo);
  return geo;
}

let aktif = null;          // o an açık kayıt
let telKafes = false;
let hangiKati = "render";  // render | dokum
let taslarAcik = true;

function malzemeler() {
  const [renk] = METAL[aktif.olcum.spec?.metalId] ?? METAL["18-beyaz"];
  return {
    metal: new THREE.MeshPhysicalMaterial({
      color: renk, metalness: 1, roughness: 0.13, envMapIntensity: 1.25,
      wireframe: telKafes,
    }),
    // Taş için gerçek kırılma pahalı ve yavaş; parlak, hafif geçirgen bir
    // fiziksel malzeme hem hızlı hem de faseti okunur kılıyor.
    tas: new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 0.82,
      thickness: 1.6, ior: 2.42, envMapIntensity: 1.6, transparent: true,
      opacity: 0.96, wireframe: telKafes,
    }),
  };
}

function temizle() {
  for (const c of [...kok.children]) {
    kok.remove(c);
    c.geometry?.dispose?.();
    c.material?.dispose?.();
  }
}

function cerceveleVeYerlestir() {
  const kutu = new THREE.Box3().setFromObject(kok);
  if (kutu.isEmpty()) return;
  const merkez = kutu.getCenter(new THREE.Vector3());
  kok.position.sub(merkez); // modeli orijine getir, kamerayı sabit tut
  const boyut = kutu.getSize(new THREE.Vector3());
  const yaricap = Math.max(boyut.x, boyut.y, boyut.z) * 0.5;
  const uzaklik = (yaricap / Math.sin((camera.fov * Math.PI) / 360)) * 1.45;
  camera.near = Math.max(0.05, uzaklik / 200);
  camera.far = uzaklik * 20;
  camera.position.set(uzaklik * 0.55, uzaklik * 0.52, uzaklik * 0.72);
  camera.updateProjectionMatrix();
  kontrol.target.set(0, 0, 0);
  kontrol.minDistance = yaricap * 0.6;
  kontrol.maxDistance = uzaklik * 6;
  kontrol.update();
}

async function ciz() {
  const mal = malzemeler();
  temizle();
  const kati = aktif.dosyalar[hangiKati] ?? aktif.dosyalar.render;
  const geo = await geometri(kati.ad, (o) => {
    durum.textContent = `${hangiKati === "dokum" ? "döküm" : "render"} katısı yükleniyor… %${Math.round(o * 100)}`;
  });
  kok.add(new THREE.Mesh(geo, mal.metal));
  if (taslarAcik && aktif.dosyalar.tas) {
    kok.add(new THREE.Mesh(await geometri(aktif.dosyalar.tas.ad), mal.tas));
  }
  // YÖNELİM AİLEYE BAĞLIDIR — bu proje bu hatayı üçüncü kez veriyor; ilk iki
  // seferinde de "hepsi aynıdır" varsayımıydı. Tablo çekirdeğin kendi Rhino
  // dönüşümünden (orfeStlRhinoYonelim) BİREBİR okunur:
  //   kolye ucu                 → çekirdekte zaten dik, üst eksen +Z
  //   damla küpe                → sarkıt −Z'de, üst eksen +Z
  //   ötekiler (yüzük, bilezik,
  //   çivi/halka küpe)          → üst eksen +Y
  // three.js +Y'yi yukarı sayar; yalnız ilk iki kümede +Z'yi +Y'ye getiren
  // −90° X dönüşü gerekir. Bütün küpeleri döndürmek halka küpeyi yatırıyordu.
  const spec = aktif.olcum.spec ?? {};
  const ustEksenZ = spec.tip === "kolye-ucu" || (spec.tip === "kupe" && spec.kupeFormu === "damla");
  kok.rotation.set(ustEksenZ ? -Math.PI / 2 : 0, 0, 0);
  kok.position.set(0, 0, 0);
  cerceveleVeYerlestir();
  durum.textContent = "";
}

function boyutla() {
  const g = sahneKutu.clientWidth, y = sahneKutu.clientHeight;
  if (!g || !y) return;
  renderer.setSize(g, y, false);
  camera.aspect = g / y;
  camera.updateProjectionMatrix();
}
new ResizeObserver(boyutla).observe(sahneKutu);

renderer.setAnimationLoop(() => {
  if (!perde.hasAttribute("open")) return;
  kontrol.update();
  renderer.render(scene, camera);
});

// Konsoldan inceleme kancası: yönelim ve çerçeveleme gözle değil ÖLÇEREK
// denetlenebilsin (bu projede yönelim üç kez yanlış çıktı).
window.orfeGoruntuleyici = { scene, kok, camera, renderer, get aktif() { return aktif; } };

const bas = (id) => document.getElementById(id);
function basiliAyarla() {
  bas("p-render").setAttribute("aria-pressed", String(hangiKati === "render"));
  bas("p-dokum").setAttribute("aria-pressed", String(hangiKati === "dokum"));
  bas("p-tas").setAttribute("aria-pressed", String(taslarAcik));
  bas("p-tel").setAttribute("aria-pressed", String(telKafes));
  bas("p-dokum").disabled = !aktif?.dosyalar.dokum;
  bas("p-tas").disabled = !aktif?.dosyalar.tas;
}

async function ac(no) {
  aktif = veri.find((s) => s.no === no);
  if (!aktif) return;
  hangiKati = "render"; taslarAcik = true; telKafes = false;
  bas("p-ad").textContent = aktif.prompt;
  const o = aktif.olcum;
  // Ölçü satırı da aileye bağlıdır: yüzükte parmak ölçüsü ve çaplar anlamlı,
  // kolye/küpe/bilezikte gabari.
  const olcuSatiri = o.olcu
    ? `TR ${o.olcu} · iç Ø${o.icCapMm} mm · dış Ø${o.disCapMm} mm`
    : o.gabariMm ? `${o.gabariMm.enMm} × ${o.gabariMm.boyMm} × ${o.gabariMm.kalinlikMm} mm` : "";
  bas("p-alt").innerHTML = [
    o.baslik,
    olcuSatiri,
    `${o.ucgenSayisi.toLocaleString("tr-TR")} üçgen (metal + taş)`,
    agirlik(o) ?? "",
  ].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join("");
  perde.setAttribute("open", "");
  scene.background = new THREE.Color(zeminRengi());
  document.body.style.overflow = "hidden";
  basiliAyarla();
  boyutla();
  durum.textContent = "yükleniyor…";
  try { await ciz(); } catch (e) { durum.textContent = `model yüklenemedi: ${e.message}`; }
}

function kapat() {
  perde.removeAttribute("open");
  document.body.style.overflow = "";
  temizle();
}

document.addEventListener("click", (e) => {
  const k = e.target.closest(".kapak");
  if (k) ac(k.dataset.no);
});
bas("p-kapat").addEventListener("click", kapat);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") kapat(); });
bas("p-sifirla").addEventListener("click", cerceveleVeYerlestir);
for (const [id, is] of [
  ["p-render", () => { hangiKati = "render"; }],
  ["p-dokum", () => { hangiKati = "dokum"; }],
  ["p-tas", () => { taslarAcik = !taslarAcik; }],
  ["p-tel", () => { telKafes = !telKafes; }],
]) {
  bas(id).addEventListener("click", async () => {
    is(); basiliAyarla();
    durum.textContent = "yükleniyor…";
    try { await ciz(); } catch (err) { durum.textContent = `model yüklenemedi: ${err.message}`; }
  });
}
