import { useRef, useState, useEffect, useCallback } from "react"; // Import useState and useEffect
import { Room, connect, createLocalAudioTrack, LocalAudioTrack, RoomEvent, RemoteParticipant, LocalParticipant } from "livekit-client"; // Import RoomEvent

export function useLiveKitAudio() {
  const roomRef = useRef<Room | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);

  // Add state variables for the connection and mic status
  const [isLiveKitConnected, setIsLiveKitConnected] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [micError, setMicError] = useState<Error | null>(null);

  // Connect to LiveKit room
  const connectToRoom = useCallback(async (url: string, token: string, roomName?: string) => { // Added roomName for consistent logging
    if (roomRef.current && roomRef.current.state === 'connected') {
        console.warn('Already connected to a LiveKit room.');
        return roomRef.current;
    }

    try {
      setMicError(null); // Clear previous errors
      const room = new Room();
      roomRef.current = room;

      // Set up event listeners for the room
      room.on(RoomEvent.Connected, () => {
        setIsLiveKitConnected(true);
        console.log('Connected to LiveKit room:', roomName || 'unknown room');
      });
      room.on(RoomEvent.Disconnected, () => {
        setIsLiveKitConnected(false);
        setIsMicActive(false); // Ensure mic status is reset on disconnect
        console.log('Disconnected from LiveKit room:', roomName || 'unknown room');
      });
      room.on(RoomEvent.MediaDevicesError, (error: Error) => {
        setMicError(error);
        console.error('LiveKit media device error:', error);
      });
      room.on(RoomEvent.LocalTrackPublished, (pub) => {
          if (pub.track instanceof LocalAudioTrack) {
              setIsMicActive(true);
          }
      });
      room.on(RoomEvent.LocalTrackUnpublished, (pub) => {
          if (pub.track instanceof LocalAudioTrack) {
              setIsMicActive(false);
          }
      });

      await room.connect(url, token, {
        autoSubscribe: false, // Set to false if you're manually managing subscriptions
      });

      return room;
    } catch (e: any) {
      console.error("Failed to connect to LiveKit room:", e);
      setMicError(e); // Set the error state
      setIsLiveKitConnected(false);
      throw e; // Re-throw to allow the calling component to handle it
    }
  }, []); // Empty dependency array means this function is created once

  // Start publishing mic audio
  const startMic = useCallback(async () => {
    if (!roomRef.current || roomRef.current.state !== 'connected') {
      const error = new Error("Not connected to room. Please connect first.");
      setMicError(error);
      throw error;
    }
    if (audioTrackRef.current) {
        console.warn('Microphone is already active.');
        return;
    }
    try {
      const track = await createLocalAudioTrack();
      await roomRef.current.localParticipant.publishTrack(track);
      audioTrackRef.current = track;
      setIsMicActive(true); // Update state to true
      setMicError(null); // Clear any previous mic errors
    } catch (e: any) {
      console.error("Failed to start microphone:", e);
      setMicError(e); // Set the error state
      setIsMicActive(false); // Ensure mic status is false on error
      throw e; // Re-throw to allow the calling component to handle it
    }
  }, []); // Empty dependency array

  // Stop publishing mic audio
  const stopMic = useCallback(() => {
    if (audioTrackRef.current && roomRef.current && roomRef.current.localParticipant) {
        roomRef.current.localParticipant.unpublishTrack(audioTrackRef.current, true); // `true` for stop and cleanup
        audioTrackRef.current.stop(); // Ensure the track itself is stopped
        audioTrackRef.current = null;
        setIsMicActive(false); // Update state to false
    } else {
        console.warn('No active microphone track to stop or not connected to room.');
        setIsMicActive(false); // Ensure state is consistent even if track is null
    }
  }, []); // Empty dependency array

  // Disconnect from room
  const disconnect = useCallback(() => {
    stopMic(); // Stop mic before disconnecting
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setIsLiveKitConnected(false); // Update state to false
    setIsMicActive(false); // Ensure mic is off
    setMicError(null); // Clear any errors
  }, [stopMic]); // Dependency on stopMic

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Ensure we clean up LiveKit resources if the component unmounts
      if (roomRef.current) {
        disconnect(); // Use the existing disconnect function for cleanup
      }
    };
  }, [disconnect]); // Dependency on disconnect

  return {
    connectToRoom,
    startMic,
    stopMic,
    disconnect,
    isMicActive,        // Now returned
    isLiveKitConnected, // Now returned
    micError,           // Now returned
    // roomRef, // You generally don't need to expose the ref directly unless a very specific use case
  };
}