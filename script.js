const STORAGE_KEY = "skillswap-posts-v1";

const samplePosts = [
  { id: "sample-1", name: "Maya Chen", kind: "offer", topic: "Calculus I", teachBack: "Python basics", format: "online", availability: [{ day: "Tuesday", start: "16:00", end: "17:00" }, { day: "Thursday", start: "16:00", end: "17:00" }], contact: "maya.chen@example.edu" },
  { id: "sample-2", name: "Ethan Brooks", kind: "need", topic: "Statistics", teachBack: "Guitar", format: "in person", availability: [{ day: "Tuesday", start: "12:00", end: "13:00" }, { day: "Thursday", start: "12:00", end: "13:00" }], contact: "@ethanb" },
  { id: "sample-3", name: "Priya Patel", kind: "offer", topic: "Financial Accounting", teachBack: "", format: "in person", availability: [{ day: "Monday", start: "18:00", end: "19:00" }, { day: "Wednesday", start: "18:00", end: "19:00" }], contact: "priya.patel@example.edu" },
  { id: "sample-4", name: "Sofia Ramirez", kind: "need", topic: "Spanish conversation", teachBack: "Chemistry", format: "online", availability: [{ day: "Saturday", start: "10:00", end: "11:00" }, { day: "Sunday", start: "10:00", end: "11:00" }], contact: "@sofiar" },
  { id: "sample-5", name: "Noah Williams", kind: "offer", topic: "Intro to Statistics", teachBack: "Guitar", format: "in person", availability: [{ day: "Tuesday", start: "14:00", end: "15:00" }, { day: "Friday", start: "14:00", end: "15:00" }], contact: "noah.w@example.edu" },
  { id: "sample-6", name: "Aisha Khan", kind: "need", topic: "Calculus I", teachBack: "Python basics", format: "online", availability: [{ day: "Monday", start: "17:00", end: "18:00" }, { day: "Wednesday", start: "17:00", end: "18:00" }], contact: "@aishak" },
  { id: "sample-7", name: "Leo Martin", kind: "offer", topic: "Spanish conversation", teachBack: "Chemistry", format: "online", availability: [{ day: "Thursday", start: "13:00", end: "14:00" }], contact: "leo.martin@example.edu" },
  { id: "sample-8", name: "Grace Kim", kind: "need", topic: "Financial Accounting", teachBack: "", format: "in person", availability: [{ day: "Friday", start: "09:00", end: "10:00" }], contact: "@gracekim" }
];

const grid = document.querySelector("#post-grid");
const searchInput = document.querySelector("#search");
const filterButtons = [...document.querySelectorAll(".filter-chip")];
const emptyState = document.querySelector("#empty-state");
const form = document.querySelector("#post-form-element");
const dialog = document.querySelector("#request-dialog");
let posts = loadPosts();
let activeFilter = "all";
let matchIds = new Set();

function loadPosts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return [...samplePosts];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(isValidPost)) throw new Error("Saved SkillSwap posts have an invalid format.");
    return parsed;
  } catch (error) {
    console.error("Unable to load saved SkillSwap posts.", error);
    return [...samplePosts];
  }
}

function isValidPost(post) {
  return post && typeof post.id === "string" && typeof post.name === "string" &&
    (post.kind === "need" || post.kind === "offer") && typeof post.topic === "string" &&
    typeof post.teachBack === "string" && (post.format === "online" || post.format === "in person") &&
    (typeof post.availability === "string" || (
      Array.isArray(post.availability) && post.availability.length > 0 && post.availability.every((slot) =>
        slot && ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].includes(slot.day) &&
        /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.start) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.end) && slot.start < slot.end
      )
    )) && typeof post.contact === "string";
}

function savePosts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    return true;
  } catch (error) {
    console.error("Unable to save SkillSwap posts.", error);
    setFormStatus("Your post could not be saved on this device. Check your browser storage settings and try again.", true);
    return false;
  }
}

function normalized(value) {
  return value.trim().toLocaleLowerCase();
}

function isSwap(post) {
  return Boolean(post.teachBack.trim());
}

function formatTime(value) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

function availabilitySearchText(post) {
  if (typeof post.availability === "string") return post.availability;
  return post.availability.map((slot) => `${slot.day} ${slot.start} ${slot.end}`).join(" ");
}

function availabilityMarkup(post) {
  if (typeof post.availability === "string") {
    return `<div class="availability-legacy"><strong>Earlier schedule — confirm timing:</strong> ${escapeHtml(post.availability)}</div>`;
  }
  return post.availability.map((slot) =>
    `<span class="time-slot"><strong>${escapeHtml(slot.day.slice(0, 3))}</strong><span>${formatTime(slot.start)}–${formatTime(slot.end)}</span></span>`
  ).join("");
}

function findMatches(post) {
  const topic = normalized(post.topic);
  const returnTopic = normalized(post.teachBack);
  return posts.filter((other) => {
    if (other.id === post.id || other.kind === post.kind || normalized(other.topic) !== topic) return false;
    if (returnTopic && normalized(other.teachBack) === returnTopic) return true;
    return !returnTopic && !other.teachBack.trim();
  }).map((postMatch) => postMatch.id);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function cardMarkup(post) {
  const mine = post.id.startsWith("user-");
  const matching = matchIds.has(post.id);
  const kindText = post.kind === "need" ? "Looking for Help" : "Providing Help";
  const badgeText = isSwap(post) ? "Swap" : "Free help";
  const requestText = post.kind === "need" ? "Offer peer help" : "Ask to learn";
  const safe = {
    name: escapeHtml(post.name), topic: escapeHtml(post.topic), teachBack: escapeHtml(post.teachBack),
    format: escapeHtml(post.format)
  };

  return `<article class="post-card${matching ? " perfect-match" : ""}${mine ? " own-post" : ""}" data-id="${escapeHtml(post.id)}">
    <div class="card-top"><span class="type-pill ${post.kind}">${kindText}</span><span class="deal-badge ${isSwap(post) ? "swap" : "free"}">${badgeText}</span>${mine ? '<span class="own-post-pill">Your post</span>' : ""}</div>
    ${matching ? '<span class="match-pill">✳ Perfect match</span>' : ""}
    <h3 class="card-name">${safe.name}</h3>
    <section class="card-course ${post.kind}" aria-label="${post.kind === "need" ? "Help requested" : "Tutoring offered"}">
      <p class="topic-label">${post.kind === "need" ? "Needs help with" : "Offering tutoring in"}</p>
      <span class="topic-tag">${safe.topic}</span>
    </section>
    ${post.teachBack ? `<div class="teach-back"><span class="teach-back-label">${post.kind === "need" ? "Can teach in return" : "Hopes to learn in return"}</span><strong>${safe.teachBack}</strong></div>` : ""}
    <div class="card-details">
      <div class="card-detail"><span class="card-detail-icon" aria-hidden="true">${post.format === "online" ? "◉" : "⌖"}</span><span>${safe.format === "online" ? "Online" : "In person"}</span></div>
    </div>
    <div class="card-availability"><p class="topic-label">Available time blocks</p><div class="time-slots">${availabilityMarkup(post)}</div></div>
    <div class="card-bottom">${mine
      ? `<span class="your-post-action">You posted this</span><button class="delete-button" type="button" data-action="delete" data-id="${escapeHtml(post.id)}" aria-label="Delete your post about ${safe.topic}">Delete</button>`
      : `<button class="request-button" type="button" data-action="request" data-id="${escapeHtml(post.id)}">${requestText}</button>`}</div>
  </article>`;
}

function visiblePosts() {
  const query = normalized(searchInput.value);
  return posts.filter((post) => {
    const matchesSearch = !query || [post.name, post.topic, post.teachBack, availabilitySearchText(post)].some((value) => normalized(value).includes(query));
    const matchesFilter = activeFilter === "all" ||
      activeFilter === post.format ||
      (activeFilter === "swap" && isSwap(post)) ||
      (activeFilter === "free help" && !isSwap(post));
    return matchesSearch && matchesFilter;
  });
}

function renderPosts() {
  const filtered = visiblePosts();
  grid.innerHTML = filtered.map(cardMarkup).join("");
  emptyState.hidden = filtered.length > 0;
  document.querySelector("#results-count").textContent = `${filtered.length} ${filtered.length === 1 ? "post" : "posts"} to explore`;
  document.querySelector("#clear-filters").hidden = !searchInput.value && activeFilter === "all";
}

function setFormStatus(message, isError = false) {
  const status = document.querySelector("#form-status");
  status.textContent = message;
  status.style.color = isError ? "#b33c35" : "";
}

function clearErrors() {
  document.querySelectorAll(".field-error").forEach((element) => { element.textContent = ""; });
  document.querySelectorAll(".field.invalid").forEach((element) => {
    element.classList.remove("invalid");
    element.querySelectorAll("[aria-invalid]").forEach((input) => {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    });
  });
}

function showError(fieldName, message) {
  const field = form.elements[fieldName];
  const wrapper = field.closest(".field");
  wrapper.classList.add("invalid");
  const error = document.querySelector(`#${fieldName}-error`);
  error.textContent = message;
  field.setAttribute("aria-invalid", "true");
  field.setAttribute("aria-describedby", error.id);
}

function setDialogStatus(message, isError = false) {
  const status = document.querySelector("#copy-status");
  status.textContent = message;
  status.classList.toggle("status-error", isError);
  status.classList.remove("status-visible");
  if (message) {
    requestAnimationFrame(() => status.classList.add("status-visible"));
  }
}

function validEmailOrHandle(value) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  return /^@?[a-z0-9_.]{2,32}$/i.test(value) || /^[a-z0-9_.]{2,32}#\d{4}$/i.test(value);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearErrors();
  setFormStatus("");
  const data = new FormData(form);
  const fields = {
    name: String(data.get("name") || "").trim(),
    kind: String(data.get("kind") || ""),
    topic: String(data.get("topic") || "").trim(),
    teachBack: String(data.get("teachBack") || "").trim(),
    format: String(data.get("format") || ""),
    availability: [...form.querySelectorAll(".availability-slot")].map((slot) => ({
      day: slot.querySelector('[name="availabilityDay"]').value,
      start: slot.querySelector('[name="availabilityStart"]').value,
      end: slot.querySelector('[name="availabilityEnd"]').value
    })),
    contact: String(data.get("contact") || "").trim()
  };
  let firstInvalid = null;
  const required = [
    ["name", fields.name, "Please enter your name."],
    ["topic", fields.topic, "Please enter a course or topic."],
    ["format", fields.format, "Please choose a preferred format."]
  ];
  required.forEach(([fieldName, value, message]) => {
    if (!value) {
      showError(fieldName, message);
      firstInvalid ||= form.elements[fieldName];
    }
  });
  const availabilityField = document.querySelector("#availability-field");
  const invalidSlotIndex = fields.availability.findIndex((slot) => !slot.day || !slot.start || !slot.end || slot.end <= slot.start);
  if (invalidSlotIndex !== -1) {
    const invalidSlot = fields.availability[invalidSlotIndex];
    const invalidRow = availabilityField.querySelectorAll(".availability-slot")[invalidSlotIndex];
    availabilityField.classList.add("invalid");
    const error = document.querySelector("#availability-error");
    error.textContent = invalidSlot.start && invalidSlot.end && invalidSlot.end <= invalidSlot.start
      ? "Each time block needs an end time later than its start time."
      : "Choose a day, start time, and end time for every time block.";
    const invalidControl = !invalidSlot.day
      ? invalidRow.querySelector("select")
      : !invalidSlot.start
        ? invalidRow.querySelector('[name="availabilityStart"]')
        : invalidRow.querySelector('[name="availabilityEnd"]');
    invalidControl.setAttribute("aria-invalid", "true");
    invalidControl.setAttribute("aria-describedby", error.id);
    firstInvalid ||= invalidControl;
  }
  if (!fields.contact) {
    showError("contact", "Please add an email address or Discord handle.");
    firstInvalid ||= form.elements.contact;
  } else if (!validEmailOrHandle(fields.contact)) {
    showError("contact", "Enter a valid email address or a Discord handle beginning with @.");
    firstInvalid ||= form.elements.contact;
  }
  if (firstInvalid) {
    firstInvalid.focus();
    setFormStatus("A couple of details need your attention.", true);
    return;
  }

  const newPost = { ...fields, id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  const matches = findMatches(newPost);
  posts.unshift(newPost);
  matchIds = new Set(matches);
  const saved = savePosts();
  renderPosts();
  form.reset();
  const availabilitySlots = document.querySelector("#availability-slots");
  while (availabilitySlots.children.length > 1) availabilitySlots.lastElementChild.remove();
  availabilitySlots.querySelector(".remove-slot").disabled = true;
  document.querySelector(`input[name="kind"][value="${fields.kind}"]`).checked = true;
  updatePostPath(fields.kind);
  document.querySelector("#match-banner").hidden = matches.length === 0;
  document.querySelector("#match-banner").textContent = matches.length
    ? `✳ We found ${matches.length} ${matches.length === 1 ? "possible match" : "possible matches"} for ${newPost.topic}! They’re highlighted below.`
    : `Your post is live! We’ll highlight a perfect match here when one appears.`;
  document.querySelector("#match-banner").hidden = false;
  if (saved) setFormStatus("Your post is live in the community.");
  document.querySelector("#community").scrollIntoView({ behavior: "smooth", block: "start" });
});

function updatePostPath(kind) {
  const providing = kind === "offer";
  document.querySelector("#path-title").textContent = providing ? "Share what you know" : "Find a study buddy";
  document.querySelector("#path-description").textContent = providing
    ? "Choose a subject you can help with, then set the times you’re available to support a peer."
    : "Tell the community what you’re working on and when you’d like to meet.";
  document.querySelector("#topic-label").textContent = providing
    ? "Course or topic you can tutor"
    : "Course or topic you need help with";
  document.querySelector("#topic").placeholder = providing
    ? "e.g. Calculus I or conversational Spanish"
    : "e.g. Intro to Statistics";
  document.querySelector("#teach-back-label").innerHTML = providing
    ? 'Skill you’d like to learn in return <span class="optional">OPTIONAL</span>'
    : 'Skill you can share in return <span class="optional">OPTIONAL</span>';
  document.querySelector("#teach-back").placeholder = providing
    ? "e.g. Basic guitar"
    : "e.g. Spanish conversation";
  document.querySelector("#teach-back-hint").textContent = providing
    ? "Leave blank to offer free peer support."
    : "Add a skill to offer in exchange, or leave blank to request free help.";
  document.querySelector("#submit-post-label").textContent = providing
    ? "Offer help to the community"
    : "Post your help request";
  renderPosts();
}

document.querySelectorAll('input[name="kind"]').forEach((radio) => {
  radio.addEventListener("change", () => updatePostPath(radio.value));
});

document.querySelector("#add-availability-slot").addEventListener("click", () => {
  const template = document.querySelector("#availability-slot-template");
  document.querySelector("#availability-slots").append(template.content.cloneNode(true));
  document.querySelectorAll(".remove-slot").forEach((button) => { button.disabled = false; });
  document.querySelector("#availability-slots").lastElementChild.querySelector("select").focus();
});

document.querySelector("#availability-slots").addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-slot");
  if (!removeButton) return;
  removeButton.closest(".availability-slot").remove();
  const slots = [...document.querySelectorAll(".availability-slot")];
  slots.forEach((slot) => { slot.querySelector(".remove-slot").disabled = slots.length === 1; });
});

searchInput.addEventListener("input", renderPosts);
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((chip) => {
      const selected = chip === button;
      chip.classList.toggle("active", selected);
      chip.setAttribute("aria-pressed", String(selected));
    });
    renderPosts();
  });
});

function resetFilters() {
  searchInput.value = "";
  activeFilter = "all";
  filterButtons.forEach((chip) => {
    const selected = chip.dataset.filter === "all";
    chip.classList.toggle("active", selected);
    chip.setAttribute("aria-pressed", String(selected));
  });
  renderPosts();
  searchInput.focus();
}
document.querySelector("#clear-filters").addEventListener("click", resetFilters);
document.querySelector("#empty-clear").addEventListener("click", resetFilters);

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

function handlePostAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const post = posts.find((item) => item.id === button.dataset.id);
  if (!post) return;
  if (button.dataset.action === "delete") {
    posts = posts.filter((item) => item.id !== post.id);
    matchIds.delete(post.id);
    savePosts();
    renderPosts();
    return;
  }
  openRequest(post);
}

grid.addEventListener("click", handlePostAction);

function openRequest(post) {
  const message = `Hi ${post.name}! I found your SkillSwap post about ${post.topic}. ${post.kind === "need" ? "I’d love to help you with it." : "I’d love to learn from you."}${post.teachBack ? ` I saw you ${post.kind === "need" ? `can teach ${post.teachBack}` : `hope to learn ${post.teachBack}`} in return.` : ""} Would you be up for connecting?`;
  document.querySelector("#request-name").textContent = post.name;
  document.querySelector("#request-message").value = message;
  setDialogStatus("");
  document.querySelector("#dialog-contact").textContent = post.contact.startsWith("@")
    ? `Their Discord: ${post.contact}`
    : `Contact: ${post.contact}`;
  const copyContactButton = document.querySelector("#copy-contact");
  copyContactButton.textContent = post.contact.startsWith("@") ? "Copy Discord handle" : "Copy email";
  copyContactButton.dataset.contact = post.contact;
  const subject = encodeURIComponent("SkillSwap — let's connect");
  const body = encodeURIComponent(`${message}${post.contact.startsWith("@") ? `\n\nI found you on Discord: ${post.contact}` : ""}`);
  const emailLink = document.querySelector("#email-link");
  emailLink.href = `mailto:${post.contact.startsWith("@") ? "" : post.contact}?subject=${subject}&body=${body}`;
  emailLink.hidden = post.contact.startsWith("@");
  emailLink.innerHTML = 'Open email <span aria-hidden="true">↗</span>';
  dialog.showModal();
}

document.querySelector("#dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

async function copyText(text, actionName) {
  setDialogStatus(`Copying ${actionName}…`);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const temporaryInput = document.createElement("textarea");
      temporaryInput.value = text;
      temporaryInput.setAttribute("readonly", "");
      temporaryInput.className = "sr-only";
      document.body.append(temporaryInput);
      temporaryInput.select();
      const copied = document.execCommand("copy");
      temporaryInput.remove();
      if (!copied) throw new Error("The browser did not copy the text.");
    }
    setDialogStatus(`${actionName} copied to your clipboard.`);
  } catch (error) {
    console.error(`Unable to copy ${actionName}.`, error);
    setDialogStatus(`Couldn’t copy ${actionName}. Select the text and copy it manually.`, true);
  }
}

document.querySelector("#copy-message").addEventListener("click", async () => {
  await copyText(document.querySelector("#request-message").value, "message");
});

document.querySelector("#copy-contact").addEventListener("click", async (event) => {
  await copyText(event.currentTarget.dataset.contact, "contact");
});

document.querySelector("#email-link").addEventListener("click", () => {
  setDialogStatus("Email app opening — your draft is ready to finish and send.");
});

renderPosts();
