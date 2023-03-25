chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // if (changeInfo.status === 'complete' && tab.url.startsWith('JIRAのアドレス')) {
  if (changeInfo.status === "complete") {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: main,
    });
  }
});

function main() {
  const BUTTON_ID = "guiai-button-id";
  const IMG_PREFIX = "guiai-";
  const GITHUB_AUTO_IMG_PREFIX = "user-content-"; // automatically added by github
  const MAX_IMG_SIZE = 100000; // 100kb

  const convertBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);

      fileReader.onload = () => {
        resolve(fileReader.result);
      };

      fileReader.onerror = (error) => {
        reject(error);
      };
    });
  };

  const uploadImage = async (event, t) => {
    const file = event.target.files[0];
    if (file.size > MAX_IMG_SIZE) {
      alert("below 100kb is allowed for base64 img");
      return;
    }
    const base64 = await convertBase64(file);
    let img = document.createElement("img");
    img.id = IMG_PREFIX + Date.now();
    img.src = base64;
    // insert img to current cursor position
    t.value =
      t.value.substring(0, t.selectionStart) +
      img.outerHTML +
      t.value.substring(t.selectionStart);
  };

  function triggerEvent(element, event) {
    if (document.createEvent) {
      // IE以外
      var evt = document.createEvent("HTMLEvents");
      evt.initEvent(event, true, true); // event type, bubbling, cancelable
      return element.dispatchEvent(evt);
    } else {
      // IE
      var evt = document.createEventObject();
      return element.fireEvent("on" + event, evt);
    }
  }

  function refreshPreviewImage() {
    const textareas = document.querySelectorAll("textarea");

    // force to load source text
    // source text in reply comment are not loaded initially until mouseover
    const summaries = document.querySelectorAll("summary");
    summaries.forEach((s) => {
      triggerEvent(s, "mouseover");
    });

    // show img: github automatically trim base64 img src...
    //           so we need to get base64 img src from textarea
    const previewImgs = document.querySelectorAll(
      `*[id*='${GITHUB_AUTO_IMG_PREFIX}${IMG_PREFIX}']`
    );
    previewImgs.forEach((img) => {
      if (img.src !== "") {
        return;
      }
      textareas.forEach((t) => {
        const div = document.createElement("div");
        div.innerHTML = t.value;
        const b64img = div.querySelectorAll(
          `*[id='${img.id.replace(GITHUB_AUTO_IMG_PREFIX, "")}']`
        );
        b64img.forEach((b64) => {
          img.src = b64.src;
        });
      });
    });
  }

  function refreshButton() {
    const markdownToolbars = document.querySelectorAll("markdown-toolbar");
    markdownToolbars.forEach((s) => {
      const textarea = s.parentElement.parentElement.querySelector("textarea");
      if (s.querySelectorAll(`#${BUTTON_ID}`).length > 0) {
        return;
      }
      const button = document.createElement("div");
      button.id = BUTTON_ID;
      button.innerText = "b64";
      button.style.cursor = "pointer";
      button.style.fontWeight = "bold";
      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const input = document.createElement("input");
        input.type = "file";
        input.onchange = (e) => {
          uploadImage(e, textarea);
        };

        input.click();
      };
      s.insertBefore(button, s.firstChild);
    });
  }

  setInterval(refreshPreviewImage, 100);
  setInterval(refreshButton, 100);
}
