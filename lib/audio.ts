export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;
  private dataArray: Uint8Array | null = null;
  private silenceThreshold = 30; // Adjust based on environment
  private silenceTimeout = 1500; // 1.5 seconds of silence before stopping
  private silenceTimer: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private onSilenceDetected?: () => void;
  private onSpeechDetected?: () => void;

  async startRecording(options?: {
    onSilenceDetected?: () => void;
    onSpeechDetected?: () => void;
    silenceTimeout?: number;
  }): Promise<void> {
    try {
      this.onSilenceDetected = options?.onSilenceDetected;
      this.onSpeechDetected = options?.onSpeechDetected;
      this.silenceTimeout = options?.silenceTimeout || 1500;

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Optimize for speech
        },
      });

      // Set up audio analysis for voice activity detection
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.startVoiceActivityDetection();
    } catch (error) {
      throw new Error('Failed to start recording. Please check microphone permissions.');
    }
  }

  private startVoiceActivityDetection(): void {
    if (!this.analyser || !this.dataArray) return;

    this.isMonitoring = true;
    const checkAudioLevel = () => {
      if (!this.isMonitoring || !this.analyser || !this.dataArray) return;

      this.analyser.getByteFrequencyData(this.dataArray);
      
      // Calculate average volume
      const average = this.dataArray.reduce((sum, value) => sum + value, 0) / this.dataArray.length;
      
      if (average > this.silenceThreshold) {
        // Speech detected
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
        this.onSpeechDetected?.();
      } else {
        // Silence detected
        if (!this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            this.onSilenceDetected?.();
          }, this.silenceTimeout);
        }
      }

      requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.isMonitoring = false;
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = () => {
        reject(new Error('Recording failed'));
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    this.isMonitoring = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.mediaRecorder = null;
    this.analyser = null;
    this.dataArray = null;
    this.audioChunks = [];
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  getCurrentVolume(): number {
    if (!this.analyser || !this.dataArray) return 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray.reduce((sum, value) => sum + value, 0) / this.dataArray.length;
  }
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private onPlaybackEnd?: () => void;

  async playAudio(audioBuffer: ArrayBuffer, options?: {
    onPlaybackEnd?: () => void;
    volume?: number;
  }): Promise<void> {
    try {
      this.onPlaybackEnd = options?.onPlaybackEnd;
      
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const decodedAudio = await this.audioContext.decodeAudioData(audioBuffer);

      // Stop any currently playing audio
      this.stopAudio();

      this.currentSource = this.audioContext.createBufferSource();
      this.gainNode = this.audioContext.createGain();
      
      this.currentSource.buffer = decodedAudio;
      this.currentSource.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Set volume
      if (options?.volume !== undefined) {
        this.gainNode.gain.value = Math.max(0, Math.min(1, options.volume));
      }

      this.isPlaying = true;

      return new Promise((resolve, reject) => {
        if (!this.currentSource) {
          reject(new Error('Failed to create audio source'));
          return;
        }

        this.currentSource.onended = () => {
          this.isPlaying = false;
          this.onPlaybackEnd?.();
          resolve();
        };

        try {
          this.currentSource.start();
        } catch (err) {
          this.isPlaying = false;
          reject(new Error('Audio playback failed: ' + (err as Error).message));
        }
      });
    } catch (error) {
      this.isPlaying = false;
      throw new Error('Failed to play audio: ' + (error as Error).message);
    }
  }

  stopAudio(): void {
    if (this.currentSource && this.isPlaying) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      this.currentSource = null;
      this.isPlaying = false;
    }
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  async cleanup(): Promise<void> {
    this.stopAudio();
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}