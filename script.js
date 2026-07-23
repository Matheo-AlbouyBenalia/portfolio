/**
 * script.js — logique partagée par les 4 pages du portfolio.
 * Architecture volontairement modulaire : chaque fonction "init*" vérifie
 * la présence de ses éléments avant de s'exécuter, ce qui permet d'inclure
 * ce même fichier sur toutes les pages sans erreur console.
 */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ----------------------------------------------------------------------
   1. THÈME CLAIR / SOMBRE
   Stratégie : prefers-color-scheme pilote le rendu par défaut (géré en CSS),
   et un choix manuel de l'utilisateur est mémorisé dans localStorage et
   appliqué via l'attribut data-theme sur <html>, qui a priorité sur le CSS.
------------------------------------------------------------------------- */
function initTheme() {
  const toggle = document.querySelector("[data-theme-toggle]");
  if (!toggle) return;

  const saved = localStorage.getItem("theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);

  const current = () =>
    document.documentElement.getAttribute("data-theme") ||
    (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

  toggle.setAttribute("aria-pressed", String(current() === "light"));

  toggle.addEventListener("click", () => {
    const next = current() === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    toggle.setAttribute("aria-pressed", String(next === "light"));
  });
}

/* ----------------------------------------------------------------------
   2. MENU MOBILE (hamburger)
------------------------------------------------------------------------- */
function initMobileMenu() {
  const btn = document.querySelector("[data-menu-toggle]");
  const links = document.querySelector("[data-nav-links]");
  if (!btn || !links) return;

  btn.addEventListener("click", () => {
    const isOpen = links.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(isOpen));
  });

  // Ferme le menu quand on choisit un lien (meilleure UX mobile)
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    })
  );
}

/* ----------------------------------------------------------------------
   3. ANIMATION CANVAS — "trace réseau"
   Élément signature du hero : simule un scan de paquets entre noeuds.
   Se fige sur une frame statique si prefers-reduced-motion est actif.
------------------------------------------------------------------------- */
function initNetworkCanvas() {
  const canvas = document.getElementById("network-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let width, height, nodes;
  const NODE_COUNT = 26;
  const LINK_DIST = 130;

  function resize() {
    width = canvas.width = canvas.clientWidth * devicePixelRatio;
    height = canvas.height = canvas.clientHeight * devicePixelRatio;
  }

  function makeNodes() {
    nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25 * devicePixelRatio,
      vy: (Math.random() - 0.5) * 0.25 * devicePixelRatio,
    }));
  }

  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent-2").trim() || "#5EEAD4";
  const accent2 = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#FFB13D";

  function frame() {
    ctx.clearRect(0, 0, width, height);
    // liaisons
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST * devicePixelRatio) {
          ctx.strokeStyle = accent;
          ctx.globalAlpha = 1 - dist / (LINK_DIST * devicePixelRatio);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    // noeuds
    nodes.forEach((n, idx) => {
      ctx.fillStyle = idx % 5 === 0 ? accent2 : accent;
      ctx.beginPath();
      ctx.arc(n.x, n.y, idx % 5 === 0 ? 2.6 : 1.8, 0, Math.PI * 2);
      ctx.fill();
      if (!prefersReducedMotion) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }
    });
    if (!prefersReducedMotion) requestAnimationFrame(frame);
  }

  resize();
  makeNodes();
  frame();
  window.addEventListener("resize", () => {
    resize();
    makeNodes();
    if (prefersReducedMotion) frame();
  });
}

/* ----------------------------------------------------------------------
   4. RÉVÉLATION AU SCROLL (IntersectionObserver)
   Anime légèrement l'apparition des blocs marqués .reveal.
   Désactivée si prefers-reduced-motion (voir CSS + garde ci-dessous).
------------------------------------------------------------------------- */
function initScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length || prefersReducedMotion) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  items.forEach((el) => observer.observe(el));
}

/* ----------------------------------------------------------------------
   5. BARRES DE COMPÉTENCES — animation de remplissage au scroll
------------------------------------------------------------------------- */
function initSkillBars() {
  const bars = document.querySelectorAll(".skill-bar-fill[data-level]");
  if (!bars.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.width = entry.target.dataset.level + "%";
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  bars.forEach((bar) => observer.observe(bar));
}

/* ----------------------------------------------------------------------
   6. FORMULAIRE DE CONTACT
   Validation côté client uniquement (pas de backend fourni). En production,
   remplacer le "fetch" simulé par un vrai endpoint (Formspree, API maison,
   fonction serverless...).
------------------------------------------------------------------------- */
function initContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;
  const status = form.querySelector(".form-status");

  const validators = {
    name: (v) => v.trim().length >= 2 || "Merci d'indiquer votre nom (2 caractères minimum).",
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Adresse email invalide.",
    message: (v) => v.trim().length >= 10 || "Votre message doit contenir au moins 10 caractères.",
  };

  function validateField(field) {
    const errorEl = form.querySelector(`[data-error-for="${field.name}"]`);
    const result = validators[field.name](field.value);
    if (result === true) {
      errorEl.textContent = "";
      field.setAttribute("aria-invalid", "false");
      return true;
    }
    errorEl.textContent = result;
    field.setAttribute("aria-invalid", "true");
    return false;
  }

  form.querySelectorAll("input, textarea").forEach((field) => {
    field.addEventListener("blur", () => validateField(field));
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fields = [...form.querySelectorAll("input[name], textarea[name]")];
    const allValid = fields.map(validateField).every(Boolean);

    if (!allValid) {
      status.dataset.state = "error";
      status.textContent = "Merci de corriger les champs signalés ci-dessus.";
      return;
    }

    // Simulation d'envoi (à remplacer par un vrai appel réseau côté prod)
    status.dataset.state = "success";
    status.textContent = "Message envoyé — merci, je reviens vers vous rapidement.";
    form.reset();
  });
}

/* ----------------------------------------------------------------------
   INITIALISATION
------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initMobileMenu();
  initNetworkCanvas();
  initScrollReveal();
  initSkillBars();
  initContactForm();
});
