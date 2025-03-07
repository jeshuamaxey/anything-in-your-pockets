// Create an audio context lazily to comply with browser autoplay policies
let audioContext: AudioContext | null = null;
let soundFXEnabled = true;
let ambientSoundEnabled = true;
let ambientAudio: HTMLAudioElement | null = null;

const AMBIENT_SOUND_FILE = '/airport-ambience.mp3'; // Placeholder filename

const getAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
    } catch (error) {
      console.error('Failed to create AudioContext:', error);
      return null;
    }
  }
  return audioContext;
};

export const toggleSoundFX = () => {
  soundFXEnabled = !soundFXEnabled;
  return soundFXEnabled;
};

export const toggleAmbientSound = () => {
  ambientSoundEnabled = !ambientSoundEnabled;
  
  if (ambientSoundEnabled) {
    startAmbientSound();
  } else {
    stopAmbientSound();
  }
  
  return ambientSoundEnabled;
};

export const isSoundFXEnabled = () => soundFXEnabled;
export const isAmbientSoundEnabled = () => ambientSoundEnabled;

export const startAmbientSound = () => {
  try {
    if (!ambientAudio) {
      ambientAudio = new Audio(AMBIENT_SOUND_FILE);
      ambientAudio.loop = true;
      ambientAudio.volume = 0.3; // 30% volume for background noise
    }
    ambientAudio.play().catch(error => {
      console.error('Failed to play ambient sound:', error);
    });
  } catch (error) {
    console.error('Failed to initialize ambient sound:', error);
  }
};

const stopAmbientSound = () => {
  if (ambientAudio) {
    ambientAudio.pause();
    ambientAudio.currentTime = 0;
  }
};

// Simple beep sound using the Web Audio API
export const playAssignSound = () => {
  if (!soundFXEnabled) return;

  try {
    const context = getAudioContext();
    if (!context) return;
    
    // Create an oscillator for a short beep
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    // Configure the sound - higher pitch, longer duration
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1200, context.currentTime); // Higher pitch
    
    // Configure volume envelope - louder, longer
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.01); // Increased volume
    gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.15); // Longer duration
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Play the sound
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.15);

    console.log('Playing assign sound'); // Debug log
  } catch (error) {
    console.error('Failed to play sound:', error);
  }
}; 