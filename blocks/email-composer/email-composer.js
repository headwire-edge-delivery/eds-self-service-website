import { SCRIPT_API, onAuthenticated, EMAIL_WORKER_API, OOPS, KESTREL_ONE, projectRepo, daProjectRepo } from "../../scripts/scripts.js";
import renderSkeleton from "../../scripts/skeletons.js";
import { loadCSS, toCamelCase } from "../../scripts/aem.js";
import { confirmDialog } from "../../scripts/dialogs.js";
import { showErrorToast, showToast } from "../../scripts/toast.js";

let timer;
const debounce = (fn) => {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
  timer = setTimeout(() => fn(), 500);
};

/**
 * @param {Element} block
 */
export default async function decorate(block) {
  onAuthenticated(async () => {
    const split = window.location.pathname.split("/");
    const id = split[2];
    const campaignSlug = split[4];
    const path = `/${split.slice(3).join("/")}`;
    const url = `https://preview--${id}.${KESTREL_ONE}${path}`;

    const token = await window.auth0Client.getTokenSilently();

    let project;

    const googleProjectResponse = await fetch(`${SCRIPT_API}/list/${id}`, {
      headers: {
        authorization: `bearer ${token}`,
      },
    });
    const googleProjectData = await googleProjectResponse.json();
    project = googleProjectData?.project;

    if (!project) {
      // try dark alley
      const darkAlleyProjectResponse = await fetch(`${SCRIPT_API}/darkAlleyList/${id}`);
      const darkAlleyProjectData = await darkAlleyProjectResponse.json();
      project = darkAlleyProjectData?.project;
    }

    // no project
    if (!project) {
      block.querySelector('.content [aria-label="loading"]').textContent = OOPS;
      return;
    }

    let editor;
    let audience;
    // replace variables
    const regExp = /(?<=\{).+?(?=\})/g;

    block.innerHTML = `
        <div class="nav">
          <div class="breadcrumbs">
            <a href="/dashboard/sites">
              Dashboard
            </a>
            <span>&rsaquo;</span>
            <a href="/site/${id}/emails/${campaignSlug}">
              ${id}
            </a>
          </div>
        </div>
        
        <div class="content">
            ${renderSkeleton("email-composer")}
        </div>
      </div>`;

    const reqEmail = await fetch(`${EMAIL_WORKER_API}/meta?contentUrl=${url}`);
    if (reqEmail.ok) {
      const { meta, variables } = await reqEmail.json();
      let customVariables = {};

      // Default contact email
      if (variables.includes("email")) {
        customVariables.email = project.contactEmail;
      }

      // Default unsubscribe link
      if (variables.includes("unsubscribe")) {
        customVariables.unsubscribe = `${SCRIPT_API}/unsubscribe/${project.projectSlug}/{id}`;
      }

      // Default copyright
      if (variables.includes("copyright")) {
        customVariables.copyright = `${new Date().getFullYear()}`;
      }

      let localSave;
      if (window.localStorage[window.location.href]) {
        try {
          localSave = JSON.parse(window.localStorage[window.location.href]);
          customVariables = localSave?.variables ?? customVariables;
        } catch {
          // do nothing
        }
      }

      block.innerHTML = `
        <div class="nav">
          <div class="breadcrumbs">
            <a href="/dashboard/sites">
              Dashboard
            </a>
            <span>&rsaquo;</span>
            <a href="/site/${id}/emails/${campaignSlug}">
              ${id}
            </a>
            <span>&rsaquo;</span>
            <a href="${window.location.href}" aria-current="page">
              <h1 class="subject">${localSave?.subject ?? meta.subject}</h1>
            </a>
          </div>
          
          <div class="actions"></div>
        </div>
        
        <div class="content">
            <div class="preview">
                <iframe class="iframe is-loading" name="preview" src="${EMAIL_WORKER_API}/preview?contentUrl=${url}"></iframe>
                <div class="skeleton" style="height: 100%; width: 100%; min-height: calc(100vh - 200px);"></div>
            </div>
            <aside>
                <div id="email-subject">
                <h2>Subject</h2>
                <input class="subject" type="text" value="${localSave?.subject ?? meta.subject}">
                </div>
                
                <div id="email-recipients">
                <h2>Recipients</h2>
                
                <div class="recipients-wrapper">
                    <table class="recipients">
                        ${renderSkeleton("recipients")}
                    </table>
                </div>
                </div>
                
                <div id="email-variables">
                <h2>Variables</h2>
                ${variables
    .map(
      (variable) => `
                  <div class="kv">
                      <input type="text" placeholder="Key" value="${variable}" readonly>
                      <input type="text" placeholder="Value" value="${customVariables[variable] ?? ""}">
                  </div>
                `,
    )
    .join("")}
                
                <div class="button-container">
                    <button class="button secondary action preview-variables">Preview</button>
                    <button class="button primary action save-variables">Save variable${variables.length > 1 ? "s" : ""}</button>
                </div>

                <div id="email-styles">
                <h2>Styles (Developer)</h2>                
                <button class="button secondary action enable-styles">Edit styles (developer mode)</button>
                <form class="form" action="${EMAIL_WORKER_API}/preview?contentUrl=${url}" method="POST" target="preview">
                    <textarea name="styles" class="styles"></textarea>
                    <div class="button-container">
                        <button type="submit" class="button secondary action">Preview</button>
                        <button type="button" class="button primary action save-styles">Save styles</button>
                    </div>
                </form>
                </div>
            </aside>
        </div>
      `;

      const subject = block.querySelector("h1.subject");
      const subjectInput = block.querySelector("input.subject");
      const iframe = block.querySelector(".iframe");
      const form = block.querySelector(".form");
      const previewVars = block.querySelector(".preview-variables");
      const saveVars = block.querySelector(".save-variables");
      let warning = { hidden: true };
      let savedEditorStyles;

      iframe.addEventListener("load", () => {
        // Add loading buffer
        setTimeout(() => {
          iframe.classList.remove("is-loading");
          iframe.parentElement.querySelector(".skeleton")?.remove();
        }, 1000);
      });
      // Loading timeout
      setTimeout(() => {
        iframe.classList.remove("is-loading");
      }, 2000);

      const hideWarning = () => {
        try {
          const JSONVars = JSON.stringify(customVariables);
          const currentSave = JSON.parse(window.localStorage[window.location.href]);
          const savedVars = JSONVars === JSON.stringify(currentSave?.variables ?? {}) && subjectInput.value === currentSave?.subject;

          if (!editor) {
            if (savedVars) {
              warning.hidden = true;
            }
            return;
          }

          if (editor.getValue() === savedEditorStyles && savedVars) {
            warning.hidden = true;
          }
        } catch {
          // do nothing
        }
      };

      // MARK: Find variable in first selected recipient columns
      const replaceMatches = (value) => {
        let newValue = value;
        const matches = value.match(regExp);
        if (matches) {
          const rendering = block.querySelector(".recipients tbody tr.is-rendering, .recipients tbody tr:has(input:checked)");
          if (!rendering) {
            return newValue;
          }

          const selectedRecipient = audience.find((contact) => contact.id === rendering.dataset.id);

          matches.forEach((match) => {
            const matchingCol = Object.keys(selectedRecipient).find((col) => col === toCamelCase(match));
            newValue = value.replace(`{${match}}`, selectedRecipient[matchingCol] ?? `{${match}}`);
          });
        }

        return newValue;
      };

      // MARK: Handle subject changes
      subjectInput.oninput = () => {
        debounce(() => {
          previewVars.click();
        });
      };

      // MARK: Render codemirror
      block.querySelector(".enable-styles").onclick = (event) => {
        window?.zaraz?.track("click email styles enable");

        event.target.remove();
        editor = window.CodeMirror.fromTextArea(block.querySelector(".styles"));
        editor.on("change", () => {
          warning.hidden = false;
        });

        savedEditorStyles = editor.getValue();
      };

      const saveStyles = block.querySelector(".save-styles");
      saveStyles.onclick = async () => {
        window?.zaraz?.track("click email preview styles");

        savedEditorStyles = editor.getValue();

        saveStyles.classList.add("loading");
        const req = await fetch(`${SCRIPT_API}/emailStyles/${id}`, {
          method: "POST",
          headers: {
            authorization: `bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            filePath: meta.styles,
            css: btoa(editor.getValue() || ""),
          }),
        });

        if (req.ok) {
          showToast("Styles updated! Updates can take up to 1 minute to be reflected for all users.");
        } else {
          showErrorToast();
        }

        saveStyles.classList.remove("loading");

        hideWarning();
      };

      // MARK: Render preview with custom variables
      previewVars.onclick = (event) => {
        iframe.classList.add("is-loading");

        if (event.isTrusted) {
          window?.zaraz?.track("click email preview variables");
        }

        block.querySelectorAll(".kv input:first-child").forEach((input) => {
          const key = input.value;
          const { value } = input.nextElementSibling;
          customVariables[key] = value;
        });

        try {
          const currentSave = JSON.parse(window.localStorage[window.location.href]);
          if (JSON.stringify(customVariables) !== JSON.stringify(currentSave?.variables ?? {}) || subjectInput.value !== currentSave?.subject) {
            warning.hidden = false;
          }
        } catch {
          // do noting
        }

        const keys = Object.keys(customVariables);
        const oldSource = new URL(iframe.src);
        const newSource = new URL(`${oldSource.origin}${oldSource.pathname}${oldSource.search}`);
        let newSubject = subjectInput.value;
        keys.forEach((key) => {
          const newValue = replaceMatches(customVariables[key]);
          newSubject = newSubject.replace(`{${key}}`, newValue || `{${key}}`);

          if (newValue) {
            newSource.searchParams.set(key, newValue);
          }
        });

        subject.textContent = newSubject;

        iframe.src = newSource.toString();
        form.action = newSource.toString();
        form.submit();
      };
      // MARK: Re-render with saved variables
      previewVars.click();

      saveVars.onclick = () => {
        window?.zaraz?.track("click email save variables");

        previewVars.click();
        window.localStorage[window.location.href] = JSON.stringify({
          subject: subjectInput.value,
          variables: customVariables,
        });

        hideWarning();

        const text = saveVars.textContent;
        saveVars.textContent = "✓";
        setTimeout(() => {
          saveVars.textContent = text;
        }, 2000);
      };

      block.querySelector(".actions").innerHTML = `
            <div class="warning" hidden>
              <span class="icon icon-info">
                <img alt src="/icons/info.svg" loading="lazy">  
              </span>
              <span>You have unsaved changes</span>
              <button type="button" aria-label="close">&#x2715;</button>
            </div>

            <a href="#" target="_blank" id="copy-button" class="button secondary action copy">Copy</a>
            <button id="edit-button" class="button action secondary edit">Edit</button>
            <button id="send-button" class="button primary action send is-disabled">Send</button>
          `;

      warning = block.querySelector(".warning");
      warning.querySelector("button").onclick = () => {
        warning.hidden = true;
      };

      const editButton = block.querySelector(".actions button.edit");
      if (project?.darkAlleyProject) {
        // DA project
        const daEditLink = document.createElement("a");
        daEditLink.classList.add("button", "action", "secondary", "edit");
        daEditLink.target = "_blank";
        daEditLink.href = `https://da.live/edit#/${daProjectRepo}/${id}${path}`;
        daEditLink.innerText = "Edit";
        daEditLink.id = "edit-button";
        editButton.replaceWith(daEditLink);
      } else {
        // is drive project
        editButton.addEventListener("click", async () => {
          editButton.classList.add("loading");
          const statusData = await fetch(`https://admin.hlx.page/status/${projectRepo}/${project.projectSlug}/main${path}?editUrl=auto`)
            .then((res) => res.json())
            .catch(() => null);
          if (statusData?.edit?.url) {
            window.open(statusData.edit.url, "_blank");
          } else {
            window.open(project.driveUrl, "_blank");
          }
          editButton.classList.remove("loading");
        });
      }

      if (project.darkAlleyProject) {
        block.querySelectorAll(".breadcrumbs a").forEach((link) => {
          if (link.href.includes("/site/")) {
            link.href = link.href.replace("/site/", "/da-site/");
          }
        });
      }

      block.querySelector(".edit").onclick = () => {
        window?.zaraz?.track("click email edit");
      };

      block.querySelector(".copy").onclick = (e) => {
        window?.zaraz?.track("click email copy");

        e.preventDefault();

        window.open(iframe.src.replace("/preview/", "/copy/"), "_blank");
      };

      // Load codemirror to edit styles
      loadCSS("/libs/codemirror/codemirror.min.css");
      await import("../../libs/codemirror/codemirror.min.js");
      await import("../../libs/codemirror/css.min.js");

      fetch(`${project.customPreviewUrl}${meta.styles}`)
        .then((resStyles) => {
          if (resStyles.ok) {
            return resStyles.text();
          }
          return "";
        })
        .then((css) => {
          const styles = block.querySelector(".styles");
          styles.value = css;
        });

      // Load email metadata
      fetch(`${SCRIPT_API}/audience/${id}`, {
        headers: {
          authorization: `bearer ${token}`,
        },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }

          return false;
        })
        .then((data) => {
          const recipients = block.querySelector(".recipients");

          if (!data?.length) {
            // eslint-disable-next-line no-param-reassign
            data = [];
          }

          audience = data.filter(({ unsubscribed }) => !unsubscribed);
          recipients.innerHTML = `
              <thead>
                <tr>
                    <th><input type="checkbox"></th>
                    <th>Email</th>
                    <th>First name</th>
                    <th>Last name</th>
                    <th></th>
                </tr>
              </thead>
              <tbody>
                ${
  audience?.length
    ? audience
      .map(
        (contact) => `<tr data-id="${contact.id}" data-email="${contact.email}">
                    <td><input type="checkbox" class="select"></td>
                    <td>${contact.email}</td>
                    <td>${contact.firstName}</td>
                    <td>${contact.lastName}</td>
                    <td>
                        <div class="button-container">
                          <button class="button secondary action render">Preview</button>
                          <button class="button secondary action remove">Delete</button>
                        </div>
                    </td>
                </tr>`,
      )
      .join("")
    : ""
}
                <tr>
                    <td></td>
                    <td><input name="email" type="email" placeholder="john.doe@example.com" required></td>
                    <td><input name="firstName" type="text" placeholder="John"></td>
                    <td><input name="lastName" type="text" placeholder="Doe"></td>
                    <td>
                        <button class="button secondary action add is-disabled">Add</button>
                    </td>
                </tr>
              </tbody>
            `;

          const send = block.querySelector(".send");
          const toggleSendDisabled = () => {
            send.classList.toggle("is-disabled", recipients.querySelector('tbody input[type="checkbox"]:checked') === null);
          };

          recipients.querySelector('thead input[type="checkbox"]').onclick = (e) => {
            const check = e.target.checked;
            recipients.querySelectorAll('tbody input[type="checkbox"]').forEach((checkbox) => {
              checkbox.checked = check;
            });

            toggleSendDisabled();
          };

          recipients.querySelector("tbody").onclick = async (e) => {
            if (e.target.matches('input[type="checkbox"]')) {
              toggleSendDisabled();
            } else if (e.target.matches(".render")) {
              window?.zaraz?.track("click email preview recipients");

              const isRendering = recipients.querySelector(".is-rendering");
              if (isRendering) {
                isRendering.classList.remove("is-rendering");
              }

              e.target.closest("tr").classList.add("is-rendering");

              // Re-render preview with newly selected recipient
              previewVars.click();
            } else if (e.target.matches(".remove")) {
              window?.zaraz?.track("click email recipients remove");

              const tr = e.target.closest("tr[data-id]");
              tr.classList.add("loading");

              const req = await fetch(`${SCRIPT_API}/audience/${id}`, {
                method: "DELETE",
                headers: {
                  authorization: `bearer ${token}`,
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  id: tr.dataset.id,
                }),
              });

              if (req.ok) {
                tr.remove();
                showToast("Recipient removed.");
              } else {
                showErrorToast();
              }

              tr.classList.remove("loading");
              toggleSendDisabled();
            }
          };

          const add = recipients.querySelector(".add");
          recipients.querySelector('input[name="email"]').oninput = (e) => {
            const { value } = e.target;
            add.classList.toggle("is-disabled", !(value.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)));
          };

          add.onclick = async () => {
            window?.zaraz?.track("click email recipients add");

            add.classList.add("loading");

            const contact = {};
            ["email", "firstName", "lastName"].forEach((name) => {
              contact[name] = recipients.querySelector(`input[name="${name}"]`).value;
            });

            const req = await fetch(`${SCRIPT_API}/audience/${id}`, {
              method: "POST",
              headers: {
                authorization: `bearer ${token}`,
                "content-type": "application/json",
              },
              body: JSON.stringify(contact),
            });

            if (req.ok) {
              const res = await req.json();
              contact.id = res.id;
              audience.push(contact);

              const tr = document.createElement("tr");
              tr.innerHTML = `
                <td><input type="checkbox" class="select"></td>
                <td>${contact.email}</td>
                <td>${contact.firstName}</td>
                <td>${contact.lastName}</td>   
                <td>
                    <div class="button-container">
                        <button class="button secondary action render">Preview</button>
                        <button class="button secondary action remove">Delete</button>
                    </div>
                </td>
              `;

              tr.dataset.id = contact.id;
              tr.dataset.email = contact.email;
              add.closest("tr").before(tr);

              // Reset
              recipients.querySelectorAll("input[name]").forEach((input) => {
                input.value = "";
              });
              showToast("Recipient added.");
            } else {
              showErrorToast();
            }

            add.classList.remove("loading");
          };

          send.onclick = async () => {
            window?.zaraz?.track("click email send");

            // Preview to update the iframe source
            previewVars.click();

            const selectedRecipients = [...recipients.querySelectorAll("tbody tr:has(input:checked)")];

            if (await confirmDialog(`You are about to send an email to ${selectedRecipients.length} recipient(s).\nDo you want to continue ?`)) {
              window?.zaraz?.track("click email copy submit");

              block.classList.add("is-sending");

              const req = await fetch(`${SCRIPT_API}/send/${id}`, {
                headers: {
                  "content-type": "application/json",
                  authorization: `bearer ${token}`,
                },
                body: JSON.stringify({
                  styles: block.querySelector(".styles").value,
                  emailUrl: iframe.src,
                  subject: subjectInput.value,
                  variables: customVariables,
                  to: audience.filter((contact) => selectedRecipients.find((el) => el.dataset.id === contact.id)),
                }),
                method: "POST",
              });

              if (req.ok) {
                showToast("Email delivered.");
              } else {
                showErrorToast();
              }

              block.classList.remove("is-sending");
            }
          };
        });
    } else {
      block.querySelector('.content [aria-label="loading"]').textContent = OOPS;
    }
  });
}
