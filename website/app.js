const CLIENT_ID = "1486449971967562010";
const SUPPORT_INVITE = "https://discord.gg/8eFmauxrNg";
const inviteUrl = new URL("https://discord.com/oauth2/authorize?client_id=1486449971967562010");

for (const link of document.querySelectorAll("[data-invite-link]")) {
  link.href = inviteUrl.toString();
}

for (const link of document.querySelectorAll("[data-support-link]")) {
  link.href = SUPPORT_INVITE;
}

const clientIdLabel = document.getElementById("client-id-label");
if (clientIdLabel) {
  clientIdLabel.textContent = `Client ID: ${CLIENT_ID}`;
}

const activePage = document.body.dataset.page;
if (activePage) {
  const activeLink = document.querySelector(`[data-nav="${activePage}"]`);
  activeLink?.classList.add("active");
}

const copyInviteButton = document.getElementById("copy-invite-button");
if (copyInviteButton) {
  copyInviteButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl.toString());
      copyInviteButton.textContent = "Lien copie";
      setTimeout(() => {
        copyInviteButton.textContent = "Copier le lien d'invitation";
      }, 1800);
    } catch {
      copyInviteButton.textContent = "Copie impossible";
      setTimeout(() => {
        copyInviteButton.textContent = "Copier le lien d'invitation";
      }, 1800);
    }
  });
}

const copyPrefixButton = document.getElementById("copy-prefix-button");
if (copyPrefixButton) {
  copyPrefixButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("+");
      copyPrefixButton.textContent = "Prefixe copie";
      setTimeout(() => {
        copyPrefixButton.textContent = "Copier le prefixe +";
      }, 1800);
    } catch {
      copyPrefixButton.textContent = "Copie impossible";
      setTimeout(() => {
        copyPrefixButton.textContent = "Copier le prefixe +";
      }, 1800);
    }
  });
}

const commandCatalog = {
  moderation: {
    title: "Gestion du staff et sanctions.",
    description: "Tout ce qu'il faut pour moderer proprement un serveur: warns, sanctions, nettoyage et suivi.",
    kicker: "Moderation",
    commands: [
      { usage: "+warn @user raison", description: "Ajoute un avertissement a un membre avec une raison." },
      { usage: "+mute @user 10 raison", description: "Met un membre en timeout pendant quelques minutes." },
      { usage: "+unmute @user", description: "Retire le timeout d'un membre." },
      { usage: "+kick @user raison", description: "Expulse un membre du serveur." },
      { usage: "+ban @user raison", description: "Bannit un membre du serveur." },
      { usage: "+unban ID", description: "Debannit un utilisateur avec son ID." },
      { usage: "+purge 20", description: "Supprime plusieurs messages d'un salon." },
      { usage: "+purge-user @user 20", description: "Supprime les messages d'un membre." },
      { usage: "+lock", description: "Verrouille le salon courant." },
      { usage: "+unlock", description: "Rouvre le salon courant." },
      { usage: "+history @user", description: "Montre l'historique des warns et notes." }
    ]
  },
  tickets: {
    title: "Support et tickets.",
    description: "Configuration du panel, ouverture, gestion et fermeture des tickets.",
    kicker: "Tickets",
    commands: [
      { usage: "+ticketsetup", description: "Affiche la configuration actuelle du panel." },
      { usage: "+ticketsetup title <texte>", description: "Change le titre du panel ticket." },
      { usage: "+ticketsetup description <texte>", description: "Change le texte du panel ticket." },
      { usage: "+ticketsetup note <texte>", description: "Ajoute une note dans le panel." },
      { usage: "+ticketsetup footer <texte>", description: "Change le footer du panel." },
      { usage: "+ticketsetup color #5865f2", description: "Definit la couleur principale du panel." },
      { usage: "+ticketsetup emoji 🎫", description: "Definit l'emoji du bouton du panel." },
      { usage: "+ticketsetup opentitle <texte>", description: "Change le titre du message d'ouverture du ticket." },
      { usage: "+ticketsetup openmessage <texte>", description: "Change le message affiche dans le ticket." },
      { usage: "+ticketsetup post", description: "Publie ou met a jour le panel ticket." },
      { usage: "+ticketpanel", description: "Alias rapide pour publier le panel." },
      { usage: "+ticketclaim", description: "Assigne le ticket au staff qui le prend en charge." },
      { usage: "+ticketclose", description: "Ferme le ticket courant." },
      { usage: "+ticketadd @user", description: "Ajoute un membre dans le ticket." },
      { usage: "+ticketremove @user", description: "Retire un membre du ticket." }
    ]
  },
  ia: {
    title: "Nova AI locale.",
    description: "Questions en mention ou via commande, avec Ollama, memoire courte et emojis propres.",
    kicker: "IA",
    commands: [
      { usage: "+ai-ask ta question", description: "Pose une question directement a Nova AI." },
      { usage: "@Nova question", description: "Declenche l'IA par mention si c'est active." },
      { usage: "+ai-status", description: "Affiche le style, le cooldown et l'etat des mentions." },
      { usage: "+ai-reset", description: "Vide la memoire de conversation du salon." },
      { usage: "+ai-style friendly", description: "Change le style de reponse de l'IA." },
      { usage: "+ai-cooldown 2", description: "Reduit ou augmente le cooldown de l'IA." },
      { usage: "+ai-mentions on", description: "Active les reponses quand on mentionne Nova." }
    ]
  },
  utility: {
    title: "Outils et utilitaires.",
    description: "Commandes pratiques pour du texte, des infos serveur et des petits outils rapides.",
    kicker: "Utilitaire",
    commands: [
      { usage: "+server", description: "Montre les informations principales du serveur." },
      { usage: "+avatar @user", description: "Affiche l'avatar d'un membre." },
      { usage: "+choose a | b", description: "Choisit entre plusieurs options." },
      { usage: "+reverse texte", description: "Inverse le texte fourni." },
      { usage: "+uppercase texte", description: "Passe le texte en majuscules." },
      { usage: "+lowercase texte", description: "Passe le texte en minuscules." },
      { usage: "+titlecase texte", description: "Met le texte en style titre." },
      { usage: "+base64-encode texte", description: "Encode un texte en base64." },
      { usage: "+base64-decode texte", description: "Decode un texte base64." },
      { usage: "+hash-sha256 texte", description: "Calcule un hash SHA-256." },
      { usage: "+random-number 1 100", description: "Genere un nombre aleatoire." },
      { usage: "+uuid", description: "Genere un identifiant unique." }
    ]
  },
  fun: {
    title: "Commandes fun.",
    description: "Des commandes legeres pour animer le serveur et faire reagir les membres.",
    kicker: "Fun",
    commands: [
      { usage: "+hug @user", description: "Envoie un hug a quelqu'un." },
      { usage: "+pat @user", description: "Pat gentil du bot." },
      { usage: "+slap @user", description: "Petit slap fun." },
      { usage: "+ship @user", description: "Calcule un pourcentage de compatibilite." },
      { usage: "+fortune", description: "Donne une prediction fun." },
      { usage: "+joke", description: "Affiche une blague rapide." },
      { usage: "+meme texte", description: "Genere une reponse style meme." },
      { usage: "+quote", description: "Affiche une citation courte." },
      { usage: "+rps pierre", description: "Joue a pierre feuille ciseaux." },
      { usage: "+8ball question", description: "Repond a une question de facon aleatoire." }
    ]
  },
  bridge: {
    title: "Chat interserveur.",
    description: "Relie plusieurs salons entre serveurs avec un bridge propre et lisible.",
    kicker: "Interserveur",
    commands: [
      { usage: "+bridge-add #salon", description: "Ajoute un salon au chat interserveur." },
      { usage: "+bridge-remove #salon", description: "Retire un salon du bridge." },
      { usage: "+bridge-list", description: "Affiche les salons relies au bridge." }
    ]
  }
};

const serverDashboard = [
  {
    name: "Yuren",
    id: "1482339195346358333",
    members: "1.2k",
    status: "Actif",
    modules: ["Tickets", "Moderation", "IA"],
    support: "#support",
    color: "online"
  },
  {
    name: "Nova Support",
    id: "112233445566778899",
    members: "840",
    status: "Actif",
    modules: ["Tickets", "Bridge", "Fun"],
    support: "#ticket-logs",
    color: "online"
  },
  {
    name: "Creator Hub",
    id: "223344556677889900",
    members: "2.8k",
    status: "Actif",
    modules: ["Moderation", "Utilitaire", "IA"],
    support: "#help",
    color: "online"
  },
  {
    name: "Community FR",
    id: "334455667788990011",
    members: "6.5k",
    status: "En attente",
    modules: ["Tickets", "Fun", "Bridge"],
    support: "#support",
    color: "idle"
  }
];

function renderCatalog(group) {
  const data = commandCatalog[group] ?? commandCatalog.moderation;
  const kicker = document.getElementById("catalog-kicker");
  const title = document.getElementById("catalog-title");
  const count = document.getElementById("catalog-count");
  const description = document.getElementById("catalog-description");
  const grid = document.getElementById("catalog-grid");

  if (!kicker || !title || !count || !description || !grid) {
    return;
  }

  kicker.textContent = data.kicker;
  title.textContent = data.title;
  description.textContent = data.description;
  count.textContent = `${data.commands.length} commande${data.commands.length > 1 ? "s" : ""}`;
  grid.innerHTML = data.commands
    .map(
      (command) => `
        <article class="catalog-card">
          <code>${command.usage}</code>
          <p>${command.description}</p>
        </article>
      `
    )
    .join("");

  for (const button of document.querySelectorAll("[data-catalog-group]")) {
    button.classList.toggle("active", button.dataset.catalogGroup === group);
  }
}

const catalogButtons = document.querySelectorAll("[data-catalog-group]");
if (catalogButtons.length) {
  for (const button of catalogButtons) {
    button.addEventListener("click", () => {
      renderCatalog(button.dataset.catalogGroup || "moderation");
    });
  }

  renderCatalog("moderation");
}

const serverGrid = document.getElementById("server-grid");
const serverSearch = document.getElementById("server-search");
const serverCount = document.getElementById("server-count");

function renderDashboard(filter = "") {
  if (!serverGrid || !serverCount) {
    return;
  }

  const query = filter.trim().toLowerCase();
  const filtered = serverDashboard.filter((server) => {
    return (
      server.name.toLowerCase().includes(query) ||
      server.id.includes(query) ||
      server.modules.some((module) => module.toLowerCase().includes(query))
    );
  });

  serverCount.textContent = `${filtered.length} serveur${filtered.length > 1 ? "s" : ""}`;
  serverGrid.innerHTML = filtered
    .map(
      (server) => `
        <article class="server-card">
          <div class="server-card-top">
            <div>
              <p class="kicker">${server.status}</p>
              <h3>${server.name}</h3>
            </div>
            <span class="server-dot ${server.color}"></span>
          </div>
          <p class="server-meta">ID: ${server.id}</p>
          <p class="server-meta">Membres: ${server.members}</p>
          <p class="server-meta">Salon support: ${server.support}</p>
          <div class="chip-row server-chip-row">
            ${server.modules.map((module) => `<span class="chip">${module}</span>`).join("")}
          </div>
        </article>
      `
    )
    .join("");
}

if (serverGrid && serverSearch) {
  renderDashboard();
  serverSearch.addEventListener("input", () => renderDashboard(serverSearch.value));
}
