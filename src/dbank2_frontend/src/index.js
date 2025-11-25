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

// Coupon redemption
const redeemBtn = document.getElementById('redeem-btn');
if (redeemBtn) {
    redeemBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const codeEl = document.getElementById('coupon-code');
        if (!codeEl) return setStatus('Coupon input missing', 'error');
        const code = String(codeEl.value || '').trim();
        if (code.length == 0) return setStatus('Enter a coupon code.', 'error');

        setStatus('Redeeming coupon…', 'processing');
        try {
            const res = await dbank2_backend.redeemCoupon(code);
            if (res === null) {
                setStatus('Coupon invalid or already used.', 'error');
            } else {
                // res is an Option-like value; Motoko bindings map ?T to nullable in JS
                const reward = res;
                setStatus(`Coupon redeemed: +$${Number(reward).toFixed(2)}`, 'success');
                showToast(`Redeemed $${Number(reward).toFixed(2)}!`);
                // Refresh balance
                try {
                    const b = await dbank2_backend.checkBalance();
                    document.getElementById('value').innerText = Number(b).toFixed(2);
                } catch (e) {
                    console.error('Failed to refresh balance after redeem:', e);
                }
            }
        } catch (err) {
            console.error('Redeem error:', err);
            setStatus('Failed to redeem coupon.', 'error');
        }
    });
}

// Admin: generate coupon
const generateBtn = document.getElementById('generate-btn');
if (generateBtn) {
    generateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const rewardEl = document.getElementById('admin-reward');
        const usesEl = document.getElementById('admin-uses');
        const outEl = document.getElementById('generated-code');
        if (!rewardEl || !usesEl || !outEl) return setStatus('Admin UI missing', 'error');

        const reward = parseFloat(rewardEl.value) || 0;
        const uses = Number.parseInt(usesEl.value) || 1;
        if (reward <= 0) return setStatus('Enter a positive reward', 'error');
        if (uses < 1) return setStatus('Uses must be at least 1', 'error');

        setStatus('Generating coupon…', 'processing');
        try {
            const code = await dbank2_backend.generateCoupon(reward, uses);
            outEl.innerText = `Generated: ${code}`;
            setStatus('Coupon generated', 'success');
            // clear inputs
            rewardEl.value = '';
            usesEl.value = '';
        } catch (err) {
            console.error('Generate error:', err);
            setStatus('Failed to generate coupon', 'error');
        }
    });
}
