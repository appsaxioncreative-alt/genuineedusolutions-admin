import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, orderBy, limit, onSnapshot, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const cfg = {
  apiKey: "AIzaSyACJNjKWv97UGevG7NNTNEJTN4XxVQlV54",
  authDomain: "genuineedusolutions-5e2c2.firebaseapp.com",
  projectId: "genuineedusolutions-5e2c2",
  storageBucket: "genuineedusolutions-5e2c2.firebasestorage.app",
  messagingSenderId: "7797802437",
  appId: "1:7797802437:web:f72b54f67bf4a6e2e677ac"
};
const app = initializeApp(cfg), auth = getAuth(app), db = getFirestore(app);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dt = t => (t && t.toDate ? t.toDate() : null);
const fmt = d => d ? d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const dur = s => s >= 60 ? Math.floor(s / 60) + "m " + (s % 60) + "s" : (s || 0) + "s";
const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2800); };
const MSG = {
  "auth/invalid-credential": "Wrong email or password.",
  "auth/email-already-in-use": "That email already has an account. Sign in instead, or use a different email.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/operation-not-allowed": "Email/Password sign-in is off. In Firebase Console go to Authentication > Sign-in method and enable Email/Password.",
  "auth/network-request-failed": "Network problem. Check your connection and any ad-blocker, then try again.",
  "permission-denied": "Firestore blocked this. In Firebase Console go to Firestore > Rules, paste firestore.rules and click Publish.",
  "failed-precondition": "Firestore database is not created yet. In Firebase Console go to Firestore Database > Create database.",
  "not-found": "Firestore database is not created yet. In Firebase Console go to Firestore Database > Create database.",
  "unavailable": "Cannot reach Firebase. Check your connection or disable ad-blocker/VPN."
};
const msg = e => MSG[e.code] || e.message;
const STATUS = ["New", "Contacted", "Follow-up", "Admitted", "Closed"];

/* ---------- Cloudinary (add your credentials here) ---------- */
// Cloud name: Cloudinary dashboard. Upload preset: Settings > Upload > Upload presets (Signing mode: Unsigned).
// Never put your API secret in this file.
const CLOUDINARY = { cloudName: "dnsextods", uploadPreset: "noovo_upload" };

async function uploadToCloudinary(file) {
  if (CLOUDINARY.cloudName.startsWith("YOUR_") || CLOUDINARY.uploadPreset.startsWith("YOUR_")) {
    throw new Error("Add your Cloudinary cloud name and upload preset in admin.js.");
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY.uploadPreset);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`, { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "Cloudinary upload failed.");
  return { url: j.secure_url, publicId: j.public_id };
}

let mode = "login", busy = false, me = null, note = "", unsubs = [], enq = [], ses = [], adm = [], courses = [], gallery = [];

/* ---------- auth screen ---------- */
function showAuth(m, err) {
  mode = m; $("#app").hidden = true; $("#auth").hidden = false;
  const s = m === "setup";
  $("#aTitle").textContent = s ? "Create the owner account" : "Admin sign in";
  $("#aSub").textContent = s ? "No admin exists yet. The first account you create becomes the owner." : "Genuine Edu-Solutions enquiry dashboard";
  $("#aNameWrap").hidden = !s; $("#aForgot").hidden = s;
  $("#aBtn").textContent = s ? "Create owner account" : "Sign in";
  $("#aPass").autocomplete = s ? "new-password" : "current-password";
  $("#aErr").textContent = err || note; note = "";
  $("#aSwitch").textContent = s ? "Already have an account? Sign in" : "First time here? Create the owner account";
}
$("#aSwitch").addEventListener("click", e => { e.preventDefault(); showAuth(mode === "setup" ? "login" : "setup"); });

async function route(user) {
  unsubs.forEach(u => u()); unsubs = []; me = null;
  if (!user) {
    try { const s = await getDoc(doc(db, "config", "setup")); showAuth(s.exists() ? "login" : "setup"); }
    catch (e) { showAuth("login", msg(e)); }
    return;
  }
  try {
    const a = await getDoc(doc(db, "admins", user.uid));
    if (!a.exists()) { note = "This account is not an admin. Ask an owner to add you."; await signOut(auth); return; }
    start(user, a.data());
  } catch (e) { note = msg(e); await signOut(auth); }
}
onAuthStateChanged(auth, u => { if (!busy) route(u); });

$("#authForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("#aEmail").value.trim().toLowerCase(), pass = $("#aPass").value, btn = $("#aBtn");
  btn.disabled = true; $("#aErr").textContent = "";
  try {
    if (mode === "setup") {
      busy = true;
      const c = await createUserWithEmailAndPassword(auth, email, pass);
      const b = writeBatch(db);
      b.set(doc(db, "admins", c.user.uid), { name: $("#aName").value.trim() || email, email, role: "owner", createdAt: serverTimestamp() });
      b.set(doc(db, "config", "setup"), { owner: email, createdAt: serverTimestamp() });
      await b.commit(); busy = false; route(c.user);
    } else await signInWithEmailAndPassword(auth, email, pass);
  } catch (x) { busy = false; $("#aErr").textContent = msg(x); }
  btn.disabled = false;
});
$("#aForgot").addEventListener("click", async e => {
  e.preventDefault();
  const email = $("#aEmail").value.trim();
  if (!email) return ($("#aErr").textContent = "Type your email first, then click Forgot password.");
  try { await sendPasswordResetEmail(auth, email); $("#aErr").textContent = "Reset link sent. Check your inbox."; } catch (x) { $("#aErr").textContent = msg(x); }
});
$("#out").addEventListener("click", () => signOut(auth));

/* ---------- app ---------- */
function start(user, data) {
  me = { uid: user.uid, ...data };
  $("#auth").hidden = true; $("#app").hidden = false;
  $("#who").textContent = (data.name || user.email) + " · " + data.role;
  const err = x => toast(msg(x));
  unsubs.push(onSnapshot(query(collection(db, "enquiries"), orderBy("createdAt", "desc")), s => { enq = s.docs.map(d => ({ id: d.id, ...d.data() })); renderAll(); }, err));
  unsubs.push(onSnapshot(query(collection(db, "sessions"), orderBy("startedAt", "desc"), limit(500)), s => { ses = s.docs.map(d => ({ id: d.id, ...d.data() })); renderAll(); }, err));
  unsubs.push(onSnapshot(collection(db, "admins"), s => { adm = s.docs.map(d => ({ id: d.id, ...d.data() })); renderAll(); }, err));
  unsubs.push(onSnapshot(query(collection(db, "courses"), orderBy("displayOrder", "asc")), s => { courses = s.docs.map(d => ({ id: d.id, ...d.data() })); renderAll(); }, err));
  unsubs.push(onSnapshot(query(collection(db, "gallery"), orderBy("displayOrder", "asc")), s => { gallery = s.docs.map(d => ({ id: d.id, ...d.data() })); renderAll(); }, err));
  unsubs.push(onSnapshot(query(collection(db, "reviews"), orderBy("displayOrder", "asc")), s => { reviews = s.docs.map(d => ({ id: d.id, ...d.data() })); renderAll(); }, err));
}
function renderAll() { overview(); enqList(); visits(); admins(); renderCourses(); renderGallery(); renderReviews(); }
document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("on", x === b));
  ["overview", "enq", "vis", "adm", "courses", "gallery", "reviews"].forEach(t => { const el = $("#t-" + t); if (el) el.hidden = t !== b.dataset.tab; });
}));

/* ---------- overview ---------- */
const bars = m => {
  const e = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 7), mx = e[0] ? e[0][1] : 1;
  return e.length ? e.map(([k, v]) => `<div class="bar"><span title="${esc(k)}">${esc(k)}</span><i style="--w:${(v / mx) * 100}%"></i><b>${v}</b></div>`).join("") : '<p class="muted">No data yet.</p>';
};
const count = (arr, f) => { const m = {}; arr.forEach(x => [].concat(f(x)).forEach(k => { if (k) m[k] = (m[k] || 0) + 1; })); return m; };
const host = r => { if (!r || r === "direct") return "direct"; try { return new URL(r).hostname.replace(/^www\./i, ""); } catch { return r; } };

function overview() {
  const now = Date.now(), n = ses.length;
  const week = enq.filter(e => { const d = dt(e.createdAt); return d && now - d < 6048e5; }).length;
  const avg = k => (n ? Math.round(ses.reduce((a, s) => a + (s[k] || 0), 0) / n) : 0);
  const rate = n ? ((100 * ses.filter(s => s.enquirySubmitted).length) / n).toFixed(1) : "0";
  const stats = [["Enquiries", enq.length], ["New", enq.filter(e => (e.status || "New") === "New").length], ["Last 7 days", week], ["Visits", n], ["Unique visitors", new Set(ses.map(s => s.visitorId)).size], ["Avg scroll depth", avg("maxScrollPct") + "%"], ["Avg time on page", dur(avg("activeSeconds"))], ["Visit → enquiry", rate + "%"]];
  $("#stats").innerHTML = stats.map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join("");
  $("#bCourse").innerHTML = bars(count(enq, e => e.course));
  $("#bState").innerHTML = bars(count(enq, e => e.state));
  $("#bSec").innerHTML = bars(count(ses, s => s.sectionsViewed || []));
  $("#bDev").innerHTML = bars(count(ses, s => s.device));
  $("#bSrc").innerHTML = bars(count(ses, s => s.utmSource || host(s.referrer)));
  $("#bHow").innerHTML = bars(count(enq, e => e.heardFrom));
  $("#bLoc").innerHTML = bars(count(enq, e => e.location));
}

/* ---------- enquiries ---------- */
function enqList() {
  const q = $("#q").value.toLowerCase(), st = $("#fs").value, fc = $("#fc"), cur = fc.value;
  fc.innerHTML = '<option value="">All courses</option>' + [...new Set(enq.map(e => e.course).filter(Boolean))].map(c => `<option ${c === cur ? "selected" : ""}>${esc(c)}</option>`).join("");
  const rows = enq.filter(e => (!st || (e.status || "New") === st) && (!fc.value || e.course === fc.value) && (!q || [e.name, e.phone, e.course, e.state, e.location, e.heardFrom, e.heardFromDetail, e.message].join(" ").toLowerCase().includes(q)));
  $("#enqCount").textContent = rows.length + " of " + enq.length;
  $("#enqBody").innerHTML = rows.map(e => {
    const digits = String(e.phone || "").replace(/\D/g, ""), wa = digits.length === 10 ? "91" + digits : digits;
    return `<tr><td>${fmt(dt(e.createdAt))}</td>
<td><b>${esc(e.name)}</b><br><a href="tel:${esc(e.phone)}">${esc(e.phone)}</a> · <a target="_blank" rel="noopener" href="https://wa.me/${wa}">WhatsApp</a></td>
<td>${esc(e.course)}</td><td>${esc(e.state || "—")}</td>
<td>${esc(e.location || "—")}</td>
<td>${e.heardFrom ? `<b>${esc(e.heardFrom)}</b>${e.heardFromDetail ? `<br><small>${esc(e.heardFromDetail)}</small>` : ""}` : "—"}</td>
<td class="msg">${esc(e.message)}${e.notes ? `<br><em>Note: ${esc(e.notes)}</em>` : ""}</td>
<td><select data-act="status" data-id="${e.id}">${STATUS.map(s => `<option ${s === (e.status || "New") ? "selected" : ""}>${s}</option>`).join("")}</select></td>
<td class="act"><button data-act="note" data-id="${e.id}">Note</button><button class="danger" data-act="del" data-id="${e.id}">Delete</button></td></tr>`;
  }).join("") || '<tr><td colspan="9" class="muted">No enquiries found.</td></tr>';
}
["q", "fs", "fc"].forEach(id => $("#" + id).addEventListener("input", enqList));

/* ---------- visitors ---------- */
function visits() {
  $("#visBody").innerHTML = ses.slice(0, 200).map(s => {
    const p = s.maxScrollPct || 0, secs = s.sectionsViewed || [];
    return `<tr><td>${fmt(dt(s.startedAt))}</td><td>${esc(s.device)} · ${esc(s.browser)} · ${esc(s.os)}</td><td>${esc(s.utmSource || host(s.referrer))}</td>
<td><span class="meter"><i style="width:${p}%"></i></span>${p}%</td><td>${dur(s.activeSeconds)}</td><td title="${esc(secs.join(", "))}">${secs.length}</td><td>${s.clickCount || 0}</td><td>${s.enquirySubmitted ? "Yes" : ""}</td></tr>`;
  }).join("") || '<tr><td colspan="8" class="muted">No visits recorded yet.</td></tr>';
}

/* ---------- admins ---------- */
function admins() {
  $("#admList").innerHTML = adm.map(a => `<div class="row"><div><b>${esc(a.name)}</b><small>${esc(a.email)} · ${esc(a.role)}</small></div>${a.id !== me.uid && a.role !== "owner" ? `<button class="ghost" data-act="rmadmin" data-id="${a.id}">Remove</button>` : ""}</div>`).join("");
}
$("#admForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("#nName").value.trim(), email = $("#nEmail").value.trim().toLowerCase(), pass = $("#nPass").value;
  try {
    // A second app instance creates the account without signing you out.
    const sec = initializeApp(cfg, "sec" + Date.now()), sa = getAuth(sec);
    const c = await createUserWithEmailAndPassword(sa, email, pass);
    await signOut(sa);
    await setDoc(doc(db, "admins", c.user.uid), { name, email, role: "admin", addedBy: me.email || "", createdAt: serverTimestamp() });
    e.target.reset(); toast("Admin added");
  } catch (x) { toast(msg(x)); }
});

/* ---------- row actions ---------- */
document.addEventListener("change", async e => {
  const t = e.target;
  if (t.dataset.act !== "status") return;
  try { await updateDoc(doc(db, "enquiries", t.dataset.id), { status: t.value }); toast("Status updated"); } catch (x) { toast(msg(x)); }
});
document.addEventListener("click", async e => {
  const t = e.target.closest("button[data-act]");
  if (!t) return;
  const id = t.dataset.id;
  try {
    if (t.dataset.act === "del" && confirm("Delete this enquiry permanently?")) { await deleteDoc(doc(db, "enquiries", id)); toast("Enquiry deleted"); }
    if (t.dataset.act === "note") {
      const cur = enq.find(x => x.id === id), n = prompt("Notes for this enquiry:", (cur && cur.notes) || "");
      if (n !== null) { await updateDoc(doc(db, "enquiries", id), { notes: n.trim() }); toast("Note saved"); }
    }
    if (t.dataset.act === "rmadmin" && confirm("Remove this admin's access?")) { await deleteDoc(doc(db, "admins", id)); toast("Admin removed"); }
  } catch (x) { toast(msg(x)); }
});

/* ---------- courses management ---------- */
const COURSE_CATEGORIES = [["health", "Healthcare"], ["biz", "Business"], ["tech", "Technology"], ["more", "More options"]];
let editingCourseId = null, selectedCourseFile = null, currentCourseImageUrl = "";
const courseForm = $("#courseForm");
const courseImageInput = $("#courseImage");
const coursePreview = $("#coursePreview");
function categoryLabel(value) {
  return COURSE_CATEGORIES.find(x => x[0] === value)?.[1] || "More options";
}
function resetCourseForm() {
  editingCourseId = null; selectedCourseFile = null; currentCourseImageUrl = "";
  courseForm.reset();
  $("#courseFormTitle").textContent = "Add a course";
  $("#courseSaveBtn").textContent = "Add course";
  $("#courseCancelBtn").hidden = true;
  coursePreview.innerHTML = '<span class="course-preview-placeholder">Image preview</span>';
  $("#courseImageHelp").textContent = "Optional · JPG, PNG or WebP · Max 5 MB";
}
function renderCourses() {
  const active = courses.filter(c => c.active !== false);
  $("#courseTotal").textContent = `${courses.length} total · ${active.length} active`;
  $("#courseRows").innerHTML = courses.map(c => `
    <tr>
      <td>${c.imageUrl ? `<img class="course-thumb" src="${esc(c.imageUrl)}" alt="" onerror="this.style.display='none'">` : '<span class="course-no-image">SVG fallback</span>'}</td>
      <td><b>${esc(c.title)}</b><small class="course-desc">${esc(c.description || "")}</small></td>
      <td>${esc(categoryLabel(c.category))}</td>
      <td>${Number(c.displayOrder ?? 0)}</td>
      <td><span class="status-pill ${c.active === false ? "off" : "on"}">${c.active === false ? "Inactive" : "Active"}</span></td>
      <td class="act"><button data-act="edit-course" data-id="${c.id}">Edit</button><button class="danger" data-act="delete-course" data-id="${c.id}">Delete</button></td>
    </tr>`).join("") || '<tr><td colspan="6" class="muted">No courses yet. Add your first course using the form.</td></tr>';
}
courseImageInput.addEventListener("change", () => {
  const file = courseImageInput.files?.[0];
  selectedCourseFile = file || null;
  if (!file) {
    coursePreview.innerHTML = currentCourseImageUrl
      ? `<img src="${esc(currentCourseImageUrl)}" alt="Current course image">`
      : '<span class="course-preview-placeholder">Image preview</span>';
    return;
  }
  if (!file.type.startsWith("image/")) {
    selectedCourseFile = null; courseImageInput.value = "";
    toast("Please choose an image file."); return;
  }
  if (file.size > 5 * 1024 * 1024) {
    selectedCourseFile = null; courseImageInput.value = "";
    toast("Image must be 5 MB or smaller."); return;
  }
  const reader = new FileReader();
  reader.onload = () => { coursePreview.innerHTML = `<img src="${reader.result}" alt="Selected course image">`; };
  reader.readAsDataURL(file);
});
$("#courseRemoveImage").addEventListener("click", () => {
  selectedCourseFile = null; currentCourseImageUrl = ""; courseImageInput.value = "";
  coursePreview.innerHTML = '<span class="course-preview-placeholder">No image · SVG fallback</span>';
});
$("#courseCancelBtn").addEventListener("click", resetCourseForm);
courseForm.addEventListener("submit", async e => {
  e.preventDefault();
  const saveBtn = $("#courseSaveBtn");
  saveBtn.disabled = true;
  try {
    const title = $("#courseTitle").value.trim();
    const category = $("#courseCategory").value;
    const description = $("#courseDescription").value.trim();
    const displayOrder = Math.max(0, Number($("#courseOrder").value) || 0);
    const active = $("#courseActive").checked;
    if (!title) throw new Error("Enter a course name.");
    let imageUrl = currentCourseImageUrl || "";
    let imagePath = $("#courseImagePath").value || "";
    if (selectedCourseFile) {
      saveBtn.textContent = "Uploading image…";
      const up = await uploadToCloudinary(selectedCourseFile);
      imageUrl = up.url; imagePath = up.publicId;
    } else if (!imageUrl) {
      imagePath = "";
    }
    const payload = { title, category, description, imageUrl, imagePath, displayOrder, active, updatedAt: serverTimestamp() };
    if (editingCourseId) {
      await updateDoc(doc(db, "courses", editingCourseId), payload);
      toast("Course updated.");
    } else {
      await setDoc(doc(collection(db, "courses")), { ...payload, createdAt: serverTimestamp() });
      toast("Course added.");
    }
    resetCourseForm();
  } catch (x) {
    console.error(x);
    toast(msg(x));
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = editingCourseId ? "Save changes" : "Add course";
  }
});
function editCourse(id) {
  const c = courses.find(x => x.id === id);
  if (!c) return;
  editingCourseId = id; selectedCourseFile = null; currentCourseImageUrl = c.imageUrl || "";
  $("#courseFormTitle").textContent = "Edit course";
  $("#courseSaveBtn").textContent = "Save changes";
  $("#courseCancelBtn").hidden = false;
  $("#courseTitle").value = c.title || "";
  $("#courseCategory").value = c.category || "more";
  $("#courseDescription").value = c.description || "";
  $("#courseOrder").value = Number(c.displayOrder ?? 0);
  $("#courseActive").checked = c.active !== false;
  $("#courseImagePath").value = c.imagePath || "";
  courseImageInput.value = "";
  coursePreview.innerHTML = currentCourseImageUrl
    ? `<img src="${esc(currentCourseImageUrl)}" alt="Current course image" onerror="this.parentElement.innerHTML='<span class=course-preview-placeholder>Image unavailable · SVG fallback</span>'">`
    : '<span class="course-preview-placeholder">No image · SVG fallback</span>';
  $("#courseImageHelp").textContent = currentCourseImageUrl ? "Current image shown · choose another to replace it" : "Optional · JPG, PNG or WebP · Max 5 MB";
  $("#courseForm").scrollIntoView({ behavior: "smooth", block: "start" });
}
async function deleteCourse(id) {
  const c = courses.find(x => x.id === id);
  if (!c || !confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, "courses", id));
    if (editingCourseId === id) resetCourseForm();
    toast("Course deleted.");
  } catch (x) { toast(msg(x)); }
}
document.addEventListener("click", e => {
  const b = e.target.closest("button[data-act]");
  if (!b) return;
  if (b.dataset.act === "edit-course") editCourse(b.dataset.id);
  if (b.dataset.act === "delete-course") deleteCourse(b.dataset.id);
});

/* ---------- gallery ---------- */
function renderGallery() {
  const shown = gallery.filter(g => g.active !== false).length;
  $("#galTotal").textContent = `${gallery.length} photos · ${shown} visible`;
  $("#galList").innerHTML = gallery.map(g => `
    <div class="gal-item ${g.active === false ? "off" : ""}">
      <img src="${esc(g.imageUrl)}" alt="" loading="lazy">
      <div class="gal-meta"><b>${esc(g.caption || "No caption")}</b><small>Order ${Number(g.displayOrder ?? 0)}</small></div>
      <div class="act"><button data-act="gal-toggle" data-id="${g.id}">${g.active === false ? "Show" : "Hide"}</button><button class="danger" data-act="gal-del" data-id="${g.id}">Delete</button></div>
    </div>`).join("") || '<p class="muted">No photos yet.</p>';
}
$("#galForm").addEventListener("submit", async e => {
  e.preventDefault();
  const files = [...$("#galFiles").files], caption = $("#galCaption").value.trim();
  const startOrder = Math.max(0, Number($("#galOrder").value) || 0), btn = $("#galBtn");
  if (!files.length) return toast("Choose at least one image.");
  btn.disabled = true;
  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith("image/") || f.size > 10 * 1024 * 1024) { toast(`Skipped ${f.name} (not an image or over 10 MB)`); continue; }
      btn.textContent = `Uploading ${i + 1} of ${files.length}…`;
      const up = await uploadToCloudinary(f);
      await setDoc(doc(collection(db, "gallery")), { caption, imageUrl: up.url, publicId: up.publicId, displayOrder: startOrder + i, active: true, createdAt: serverTimestamp() });
    }
    e.target.reset(); toast("Gallery updated.");
  } catch (x) { console.error(x); toast(msg(x)); }
  finally { btn.disabled = false; btn.textContent = "Upload"; }
});
document.addEventListener("click", async e => {
  const b = e.target.closest("button[data-act]");
  if (!b || !b.dataset.act.startsWith("gal-")) return;
  const g = gallery.find(x => x.id === b.dataset.id);
  if (!g) return;
  try {
    if (b.dataset.act === "gal-toggle") await updateDoc(doc(db, "gallery", g.id), { active: g.active === false });
    if (b.dataset.act === "gal-del" && confirm("Remove this photo from the gallery?")) { await deleteDoc(doc(db, "gallery", g.id)); toast("Photo removed."); }
  } catch (x) { toast(msg(x)); }
});/* ---------- reviews ---------- */
let reviews = [], editingReviewId = null;
const revForm = $("#revForm");
const starStr = n => { n = Math.max(1, Math.min(5, Number(n) || 5)); return "★".repeat(n) + "☆".repeat(5 - n); };

function resetRevForm() {
  editingReviewId = null;
  revForm.reset();
  $("#revFormTitle").textContent = "Add a review";
  $("#revSaveBtn").textContent = "Add review";
  $("#revCancelBtn").hidden = true;
}
function renderReviews() {
  const shown = reviews.filter(r => r.active !== false).length;
  $("#revTotal").textContent = `${reviews.length} reviews · ${shown} visible`;
  $("#revRows").innerHTML = reviews.map(r => `
    <tr>
      <td><b>${esc(r.name)}</b><small class="course-desc">${esc(r.location || "")}</small></td>
      <td class="msg">${esc(r.text)}</td>
      <td style="color:#f5a524;white-space:nowrap">${starStr(r.rating)}</td>
      <td>${Number(r.displayOrder ?? 0)}</td>
      <td><span class="status-pill ${r.active === false ? "off" : "on"}">${r.active === false ? "Hidden" : "Visible"}</span></td>
      <td class="act"><button data-act="edit-review" data-id="${r.id}">Edit</button><button data-act="toggle-review" data-id="${r.id}">${r.active === false ? "Show" : "Hide"}</button><button class="danger" data-act="delete-review" data-id="${r.id}">Delete</button></td>
    </tr>`).join("") || '<tr><td colspan="6" class="muted">No reviews yet. Add your first one using the form.</td></tr>';
}
$("#revCancelBtn").addEventListener("click", resetRevForm);
revForm.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("#revSaveBtn");
  btn.disabled = true;
  try {
    const payload = {
      name: $("#revName").value.trim(),
      location: $("#revLocation").value.trim(),
      rating: Math.max(1, Math.min(5, Number($("#revRating").value) || 5)),
      text: $("#revText").value.trim(),
      displayOrder: Math.max(0, Number($("#revOrder").value) || 0),
      active: $("#revActive").checked,
      updatedAt: serverTimestamp()
    };
    if (!payload.name || !payload.text) throw new Error("Enter the student name and the review text.");
    if (editingReviewId) {
      await updateDoc(doc(db, "reviews", editingReviewId), payload);
      toast("Review updated.");
    } else {
      await setDoc(doc(collection(db, "reviews")), { ...payload, createdAt: serverTimestamp() });
      toast("Review added.");
    }
    resetRevForm();
  } catch (x) { console.error(x); toast(msg(x)); }
  finally { btn.disabled = false; btn.textContent = editingReviewId ? "Save changes" : "Add review"; }
});
document.addEventListener("click", async e => {
  const b = e.target.closest("button[data-act]");
  if (!b || !b.dataset.act.endsWith("-review")) return;
  const r = reviews.find(x => x.id === b.dataset.id);
  if (!r) return;
  try {
    if (b.dataset.act === "edit-review") {
      editingReviewId = r.id;
      $("#revFormTitle").textContent = "Edit review";
      $("#revSaveBtn").textContent = "Save changes";
      $("#revCancelBtn").hidden = false;
      $("#revName").value = r.name || "";
      $("#revLocation").value = r.location || "";
      $("#revRating").value = String(r.rating || 5);
      $("#revText").value = r.text || "";
      $("#revOrder").value = Number(r.displayOrder ?? 0);
      $("#revActive").checked = r.active !== false;
      revForm.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (b.dataset.act === "toggle-review") await updateDoc(doc(db, "reviews", r.id), { active: r.active === false });
    if (b.dataset.act === "delete-review" && confirm(`Delete the review by "${r.name}"?`)) {
      await deleteDoc(doc(db, "reviews", r.id));
      if (editingReviewId === r.id) resetRevForm();
      toast("Review deleted.");
    }
  } catch (x) { toast(msg(x)); }
});