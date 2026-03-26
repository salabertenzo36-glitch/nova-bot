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
