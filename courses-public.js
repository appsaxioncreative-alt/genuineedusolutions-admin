import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const CLOUDINARY = { cloudName: "dnsextods", uploadPreset: "noovo_upload" };

const firebaseConfig = {
  apiKey: "AIzaSyACJNjKWv97UGevG7NNTNEJTN4XxVQlV54",
  authDomain: "genuineedusolutions-5e2c2.firebaseapp.com",
  projectId: "genuineedusolutions-5e2c2",
  storageBucket: "genuineedusolutions-5e2c2.firebasestorage.app",
  messagingSenderId: "7797802437",
  appId: "1:7797802437:web:f72b54f67bf4a6e2e677ac"
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const grid = document.querySelector("#ccGrid");
const imageStyle = document.createElement("style");
imageStyle.textContent = ".cc .art .course-photo{display:block;width:100%;height:150px;object-fit:cover}.cc .art{overflow:hidden}";
document.head.appendChild(imageStyle);
const filterButtons = [...document.querySelectorAll(".chip-f")];
const fallback = {
  health: `<svg viewBox="0 0 260 150" aria-hidden="true"><circle cx="130" cy="72" r="46" fill="#fff" opacity=".95"/><rect x="119" y="46" width="22" height="52" rx="6" fill="#e0562a"/><rect x="104" y="61" width="52" height="22" rx="6" fill="#e0562a"/><path d="M10 124h58l10-22 14 40 12-30 8 12h148" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/></svg>`,
  biz: `<svg viewBox="0 0 260 150" aria-hidden="true"><rect x="40" y="22" width="180" height="104" rx="14" fill="#fff" opacity=".96"/><rect x="68" y="76" width="22" height="38" rx="5" fill="#8a6cf5"/><rect x="104" y="58" width="22" height="56" rx="5" fill="#5b45e0"/><rect x="140" y="44" width="22" height="70" rx="5" fill="#e0562a"/><rect x="176" y="34" width="22" height="80" rx="5" fill="#ffb84d"/></svg>`,
  tech: `<svg viewBox="0 0 260 150" aria-hidden="true"><rect x="62" y="24" width="136" height="88" rx="10" fill="#1b1a4e"/><rect x="68" y="30" width="124" height="76" rx="6" fill="#2a2870"/><path d="M80 48h34M80 62h60M92 76h44M80 90h28" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M44 118h172l-12 14H56z" fill="#fff"/></svg>`,
  more: `<svg viewBox="0 0 260 150" aria-hidden="true"><rect x="62" y="104" width="136" height="14" rx="4" fill="#fff"/><rect x="72" y="90" width="116" height="14" rx="4" fill="#ffb84d"/><path d="M130 22l-70 28 70 28 70-28z" fill="#1b1a4e"/><path d="M92 62v18c10 8 26 12 38 12s28-4 38-12V62l-38 15z" fill="#2a2870"/></svg>`
};
const palette = {
  health: ["#5b45e0", "#8a6cf5"], biz: ["#e0562a", "#ffb84d"],
  tech: ["#2a2870", "#5b45e0"], more: ["#1b1a4e", "#c2486f"]
};
const categoryNames = {health:"Healthcare",biz:"Business",tech:"Technology",more:"More options"};
let allCourses = [], activeFilter = "all";
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function courseCard(course) {
  const category = palette[course.category] ? course.category : "more";
  const [a,b] = palette[category];
  const title = escapeHtml(course.title);
  const description = escapeHtml(course.description || "Contact us for course details and admission guidance.");
  const art = course.imageUrl
    ? `<img class="course-photo" src="${escapeHtml(course.imageUrl)}" alt="${title}" loading="lazy">`
    : fallback[category];
  return `<article class="cc" data-cat="${category}" style="--a:${a};--b:${b}">
    <div class="art">${art}<span class="tag">${categoryNames[category]}</span></div>
    <div class="cc-body"><h3>${title}</h3><p>${description}</p>
      <div class="cc-links"><a class="cc-link" href="#contact" data-course="${title}">Enquire about this course →</a></div>
    </div>
  </article>`;
}
function render() {
  const visible = allCourses.filter(c => c.active !== false && (activeFilter === "all" || c.category === activeFilter));
  grid.innerHTML = visible.map(courseCard).join("") || '<p class="muted course-empty">No courses are currently listed in this category. Contact us for guidance.</p>';
  grid.querySelectorAll("img.course-photo").forEach(img => {
    img.addEventListener("error", () => {
      const category = img.closest(".cc")?.dataset.cat || "more";
      img.replaceWith(document.createRange().createContextualFragment(fallback[category] || fallback.more));
    }, { once: true });
  });
}
filterButtons.forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.f || "all";
  filterButtons.forEach(x => x.classList.toggle("active", x === button));
  render();
}));
onSnapshot(query(collection(db, "courses"), where("active", "==", true), orderBy("displayOrder", "asc")), snapshot => {
  allCourses = snapshot.docs.map(d => ({id:d.id,...d.data()}));
  render();
}, error => {
  console.error("[GES] Courses could not be loaded:", error);
  // Keep the existing hardcoded cards visible if Firestore is unavailable.
});
