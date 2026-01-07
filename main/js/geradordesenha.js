
const lengthSlider = document.getElementById("length");
const lengthValue = document.getElementById("lengthValue");

lengthSlider.addEventListener("input", () => {
    lengthValue.textContent = lengthSlider.value;
});

function generatePassword() {
    const length = parseInt(lengthSlider.value);
    const uppercase = document.getElementById("uppercase").checked;
    const lowercase = document.getElementById("lowercase").checked;
    const numbers = document.getElementById("numbers").checked;
    const symbols = document.getElementById("symbols").checked;
    const excludeSimilar = document.getElementById("excludeSimilar").checked;
    const noRepeat = document.getElementById("noRepeat").checked;

    let chars = "";
    let upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let lower = "abcdefghijklmnopqrstuvwxyz";
    let nums = "0123456789";
    let symb = "!@#$%&*()_+-=[]{}<>?";

    if (excludeSimilar) {
        upper = upper.replace(/[OIL]/g, "");
        lower = lower.replace(/[oil]/g, "");
        nums = nums.replace(/[01]/g, "");
    }

    if (uppercase) chars += upper;
    if (lowercase) chars += lower;
    if (numbers) chars += nums;
    if (symbols) chars += symb;

    if (!chars) {
        alert("Selecione ao menos uma opção.");
        return;
    }

    let password = "";

    for (let i = 0; i < length; i++) {
        const char = chars.charAt(Math.floor(Math.random() * chars.length));
        if (noRepeat && password.includes(char)) {
            i--;
            continue;
        }
        password += char;
    }

    document.getElementById("passwordOutput").value = password;
    updateStrength(password);
}

function updateStrength(password) {
    let strength = 0;

    if (password.length >= 12) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 15;

    const bar = document.getElementById("strengthBar");
    bar.style.width = strength + "%";

    bar.className = "progress-bar";
    if (strength < 40) bar.classList.add("bg-danger");
    else if (strength < 70) bar.classList.add("bg-warning");
    else bar.classList.add("bg-success");
}

function copyPassword() {
    const field = document.getElementById("passwordOutput");
    field.select();
    document.execCommand("copy");
}

