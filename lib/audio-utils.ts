// lib/audio-utils.ts
export class AudioProcessor {
  static async processAudioFile(file: File): Promise<{
    duration: number;
    waveformData: number[];
    compressedBlob: Blob;
  }> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      audio.onloadedmetadata = async () => {
        const duration = audio.duration;
        
        try {
          // Create AudioContext for waveform generation
          const audioContext = new (
            window.AudioContext ||
            (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
          )();
          const arrayBuffer = await file.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Generate waveform data
          const waveformData = this.generateWaveform(audioBuffer);
          
          // Compress audio (basic implementation)
          const compressedBlob = await this.compressAudio(file);
          
          resolve({
            duration,
            waveformData,
            compressedBlob
          });
          
        } catch (error) {
          reject(error);
        }
      };
      
      audio.onerror = reject;
      audio.src = URL.createObjectURL(file);
    });
  }
  
  private static generateWaveform(audioBuffer: AudioBuffer): number[] {
    const channelData = audioBuffer.getChannelData(0);
    const samples = 200; // Number of waveform bars
    const blockSize = Math.floor(channelData.length / samples);
    const waveformData = [];
    
    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      let sum = 0;
      
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[start + j] || 0);
      }
      
      waveformData.push(sum / blockSize);
    }
    
    return waveformData;
  }
  
  private static async compressAudio(file: File): Promise<Blob> {
    // Basic compression - in production use Web Audio API or server-side processing
    return file; // Placeholder - would implement actual compression
  }
  
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}