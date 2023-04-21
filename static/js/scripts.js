async function getChain() {
    const response = await fetch('/chain');
    const data = await response.json();
    document.getElementById('chain').textContent = JSON.stringify(data.chain, null, 2);
}
