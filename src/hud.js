export function createHUD(container) {
  container.innerHTML = `
    <div class="hud-horizon" id="hud-horizon">
      <div class="horizon-sky"></div>
      <div class="horizon-ground"></div>
      <div class="horizon-line" id="horizon-line"></div>
    </div>
    <div class="hud-left">
      <div class="hud-panel">
        <div class="label">Airspeed</div>
        <div class="value" id="hud-speed">0</div>
        <div class="label">KTS</div>
      </div>
      <div class="hud-panel">
        <div class="label">Altitude</div>
        <div class="value" id="hud-alt">0</div>
        <div class="label">FT AGL</div>
      </div>
    </div>
    <div class="hud-right">
      <div class="hud-panel">
        <div class="label">Heading</div>
        <div class="value" id="hud-hdg">000</div>
      </div>
      <div class="hud-panel">
        <div class="label">Throttle</div>
        <div class="value" id="hud-throttle">0%</div>
      </div>
    </div>
    <div class="hud-top hud-panel">
      <div class="label">Score</div>
      <div class="value" id="hud-score">0</div>
    </div>
    <div class="hud-top hud-panel" style="top: 4.5rem;" id="hud-status"></div>
  `;

  return {
    speed: container.querySelector("#hud-speed"),
    alt: container.querySelector("#hud-alt"),
    hdg: container.querySelector("#hud-hdg"),
    throttle: container.querySelector("#hud-throttle"),
    score: container.querySelector("#hud-score"),
    status: container.querySelector("#hud-status"),
    horizonLine: container.querySelector("#horizon-line"),
    horizon: container.querySelector("#hud-horizon"),
  };
}

export function updateHUD(hud, flight, groundY, score, stallSpeed) {
  const speed = flight.getAirspeed();
  const alt = flight.getAltitude(groundY);
  const hdg = flight.getHeading();

  hud.speed.textContent = Math.round(speed);
  hud.alt.textContent = Math.round(Math.max(0, alt));
  hud.hdg.textContent = String(Math.round(hdg)).padStart(3, "0");
  hud.throttle.textContent = `${Math.round(flight.throttle * 100)}%`;
  hud.score.textContent = score;

  hud.speed.classList.toggle("hud-warning", speed < stallSpeed * 1.94384 && !flight.onGround);
  hud.speed.classList.toggle("hud-danger", speed < stallSpeed * 1.94384 * 0.6 && !flight.onGround);

  if (flight.onGround) {
    hud.status.textContent = "ON GROUND";
    hud.status.style.opacity = "0.7";
  } else if (speed < stallSpeed * 1.94384) {
    hud.status.textContent = "STALL WARNING";
    hud.status.style.opacity = "1";
    hud.status.className = "hud-top hud-panel hud-warning";
  } else {
    hud.status.textContent = "";
    hud.status.className = "hud-top hud-panel";
    hud.status.style.opacity = "0";
  }

  // Artificial horizon
  const pitchDeg = (flight.euler.x * 180) / Math.PI;
  const rollDeg = (flight.euler.z * 180) / Math.PI;
  hud.horizon.style.transform = `translate(-50%, -50%) rotate(${rollDeg}deg)`;
  hud.horizonLine.style.transform = `translateY(${pitchDeg * 1.2}px) rotate(${-rollDeg}deg)`;
}
