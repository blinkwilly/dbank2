import { dbank2_backend } from "../../declarations/dbank2_backend";
import logo from "./logo2.png";

// Status and toast helpers
function setStatus(message, type = "info") {
    const statusEl = document.getElementById("status");
    statusEl.className = "";
    statusEl.classList.add(`status-${type}`);
    statusEl.innerText = message;

    clearTimeout(window._statusTimeout);
    window._statusTimeout = setTimeout(() => { statusEl.style.opacity = "0"; }, 4000);
    statusEl.style.opacity = "1";
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.style.display = "block";
    setTimeout(() => toast.style.opacity = 1, 10);
    setTimeout(() => { toast.style.opacity = 0; setTimeout(() => toast.style.display = "none", 400); }, 1800);
}

// Load balance and logo
window.addEventListener("load", async () => {
    try {
        const balance = await dbank2_backend.checkBalance();
        document.getElementById("value").innerText = Number(balance).toFixed(2);
    } catch (err) {
        console.error("Failed to load balance:", err);
        setStatus("Unable to fetch balance.", "error");
    }

    const logoImg = document.getElementById("logo-img");
    if (logoImg) logoImg.src = logo;
});

// Handle form submission (scoped to transactions form)
const transactionsForm = document.getElementById('transactions-form');
if (transactionsForm) {
    transactionsForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const topUp = parseFloat(document.getElementById("input-amount").value) || 0;
        const withdraw = parseFloat(document.getElementById("withdrawal-amount").value) || 0;
        if (topUp <= 0 && withdraw <= 0) return setStatus("Enter an amount first.", "error");

        const valueEl = document.getElementById("value");
        const submitBtn = document.getElementById("submit-btn");
        const inputTop = document.getElementById("input-amount");
        const inputWithdraw = document.getElementById("withdrawal-amount");
        const loader = document.getElementById("loader");

        // Show processing
        setStatus("Processing…", "processing");
        if (loader) loader.style.display = "block";

        // Optimistic UI update
        const currentDisplayed = parseFloat(valueEl.innerText) || 0;
        valueEl.innerText = (currentDisplayed + topUp - withdraw).toFixed(2);

        // Disable form inputs
        submitBtn.disabled = true;
        inputTop.disabled = true;
        inputWithdraw.disabled = true;

        try {
            const ops = [];
            if (topUp > 0) ops.push(dbank2_backend.topUp(topUp));
            if (withdraw > 0) ops.push(dbank2_backend.withdraw(withdraw));

            await Promise.all(ops);

            // Fetch final balance
            const finalBalance = await dbank2_backend.checkBalance();
            valueEl.innerText = Number(finalBalance).toFixed(2);

            // Success message & toast
            if (topUp > 0 && withdraw > 0) {
                setStatus("Deposit and withdrawal successful.", "success");
                showToast("Deposit & Withdrawal complete!");
            } else if (topUp > 0) {
                setStatus("Deposit successful.", "success");
                showToast("Deposit complete!");
            } else {
                setStatus("Withdrawal successful.", "success");
                showToast("Withdrawal complete!");
            }
        } catch (err) {
            console.error("Transaction error:", err);
            try {
                const fallback = await dbank2_backend.checkBalance();
                valueEl.innerText = Number(fallback).toFixed(2);
            } catch (recoverErr) {
                console.error("Failed to recover balance:", recoverErr);
            }
            setStatus("Transaction failed. Please try again.", "error");
        } finally {
            // Re-enable form and hide loader
            submitBtn.disabled = false;
            inputTop.disabled = false;
            inputWithdraw.disabled = false;
            inputTop.value = "";
            inputWithdraw.value = "";
            if (loader) loader.style.display = "none";
        }
    });
}
