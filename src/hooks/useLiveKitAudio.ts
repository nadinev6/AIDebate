import { useRef } from "react";
import { Room, connect, createLocalAudioTrack, LocalAudioTrack } from "livekit-client";

export function useLiveKitAudio() {
  const roomRef = useRef<Room | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);

  // Connect to LiveKit room
  const connectToRoom = async (url: string, token: string) => {
    if (roomRef.current) return roomRef.current;
    const room = await connect(url, token, { autoSubscribe: true });
    roomRef.current = room;
    return room;
  };

  // Start publishing mic audio
  const startMic = async () => {
    if (!roomRef.current) throw new Error("Not connected to room");
    if (audioTrackRef.current) return;
    const track = await createLocalAudioTrack();
    await roomRef.current.localParticipant.publishTrack(track);
    audioTrackRef.current = track;
  };

  // Stop publishing mic audio
  const stopMic = () => {
    if (audioTrackRef.current && roomRef.current) {
      roomRef.current.localParticipant.unpublishTrack(audioTrackRef.current);
      audioTrackRef.current.stop();
      audioTrackRef.current = null;
    }
  };

  // Disconnect from room
  const disconnect = () => {
    stopMic();
    roomRef.current?.disconnect();
    roomRef.current = null;
  };

  return {
    connectToRoom,
    startMic,
    stopMic,
    disconnect,
    roomRef,
  };
}