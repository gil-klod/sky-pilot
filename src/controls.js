const HELD = new Set();

const KEY_MAP = {
  KeyW: "pitchUp",
  ArrowUp: "pitchUp",
  KeyS: "pitchDown",
  ArrowDown: "pitchDown",
  KeyA: "rollLeft",
  ArrowLeft: "rollLeft",
  KeyD: "rollRight",
  ArrowRight: "rollRight",
  KeyQ: "yawLeft",
  KeyE: "yawRight",
  ShiftLeft: "throttleUp",
  ShiftRight: "throttleUp",
  ControlLeft: "throttleDown",
  ControlRight: "throttleDown",
  Space: "brake",
  KeyC: "toggleCamera",
  KeyR: "reset",
  Escape: "skipDemo",
  KeyF: "toggleAutopilot",
  KeyM: "nextMission",
  Digit1: "aircraftProp",
  Digit2: "aircraftJet",
  Digit3: "aircraftHeli",
};

export function initControls(onAction) {
  window.addEventListener("keydown", (e) => {
    const action = KEY_MAP[e.code];
    if (!action) return;

    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }

    if (
      action === "toggleCamera" ||
      action === "reset" ||
      action === "skipDemo" ||
      action === "toggleAutopilot" ||
      action === "nextMission" ||
      action.startsWith("aircraft")
    ) {
      if (!HELD.has(e.code)) onAction(action);
      HELD.add(e.code);
      return;
    }

    HELD.add(e.code);
  });

  window.addEventListener("keyup", (e) => {
    HELD.delete(e.code);
  });

  window.addEventListener("blur", () => HELD.clear());
}

export function getInput() {
  const active = (name) =>
    Object.entries(KEY_MAP).some(([code, action]) => action === name && HELD.has(code));

  return {
    pitchUp: active("pitchUp"),
    pitchDown: active("pitchDown"),
    rollLeft: active("rollLeft"),
    rollRight: active("rollRight"),
    yawLeft: active("yawLeft"),
    yawRight: active("yawRight"),
    throttleUp: active("throttleUp"),
    throttleDown: active("throttleDown"),
    brake: active("brake"),
  };
}
