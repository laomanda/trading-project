// Custom Alert Sound
const PING_SOUND = "/alert/ingatan.mp3";

const SOUND_KEY = "qai_sound_enabled";

let currentAudio: HTMLAudioElement | null = null;

export const getSoundEnabled = () => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(SOUND_KEY) !== "false";
};

export const setSoundEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_KEY, enabled.toString());
};

export function playSignalAlert(loop = true) {
  if (!getSoundEnabled()) return;

  try {
    // Stop existing if any
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    currentAudio = new Audio(PING_SOUND);
    currentAudio.volume = 0.5; 
    currentAudio.loop = loop; // Loop by default for "Alarm" effect until closed
    
    currentAudio.play().catch(e => {
        console.warn("Audio play blocked:", e);
    });
  } catch (error) {
    console.error("Audio Alert Error:", error);
  }
}

export function stopSignalAlert() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
}
