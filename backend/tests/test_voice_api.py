"""
AI Debate Partner - Voice API Tests
Sprint 3: Unit tests for voice session endpoints
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import uuid
import time

from backend.main import app
from backend.config import settings

client = TestClient(app)

class TestVoiceAPI:
    """Test suite for voice session API endpoints"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.test_user_identity = f"test_user_{uuid.uuid4().hex[:8]}"
        self.test_room_name = f"test_room_{uuid.uuid4().hex[:8]}"
    
    @patch('backend.main.settings')
    def test_start_voice_session_success(self, mock_settings):
        """Test successful voice session creation"""
        # Mock LiveKit credentials
        mock_settings.LIVEKIT_API_KEY = "test_api_key"
        mock_settings.LIVEKIT_API_SECRET = "test_api_secret"
        mock_settings.LIVEKIT_URL = "wss://test.livekit.io"
        mock_settings.MAX_CONCURRENT_SESSIONS = 10
        mock_settings.VOICE_SESSION_TIMEOUT = 3600
        
        with patch('backend.main.generate_livekit_token') as mock_token:
            mock_token.return_value = "mock_jwt_token"
            
            response = client.post("/api/voice/start-session", json={
                "user_identity": self.test_user_identity,
                "participant_name": "Test User",
                "room_name": self.test_room_name
            })
            
            assert response.status_code == 200
            data = response.json()
            
            assert "token" in data
            assert "session_id" in data
            assert "room_name" in data
            assert "livekit_url" in data
            assert "expires_at" in data
            
            assert data["token"] == "mock_jwt_token"
            assert data["room_name"] == self.test_room_name
    
    def test_start_voice_session_missing_credentials(self):
        """Test voice session creation without LiveKit credentials"""
        with patch('backend.main.settings') as mock_settings:
            mock_settings.LIVEKIT_API_KEY = None
            mock_settings.LIVEKIT_API_SECRET = None
            
            response = client.post("/api/voice/start-session", json={
                "user_identity": self.test_user_identity,
                "participant_name": "Test User"
            })
            
            assert response.status_code == 500
            assert "LiveKit credentials not configured" in response.json()["detail"]
    
    def test_start_voice_session_invalid_request(self):
        """Test voice session creation with invalid request data"""
        response = client.post("/api/voice/start-session", json={
            # Missing required user_identity field
            "participant_name": "Test User"
        })
        
        assert response.status_code == 422  # Validation error
    
    @patch('backend.main.settings')
    def test_get_voice_session_status(self, mock_settings):
        """Test retrieving voice session status"""
        mock_settings.LIVEKIT_API_KEY = "test_api_key"
        mock_settings.LIVEKIT_API_SECRET = "test_api_secret"
        mock_settings.LIVEKIT_URL = "wss://test.livekit.io"
        mock_settings.MAX_CONCURRENT_SESSIONS = 10
        mock_settings.VOICE_SESSION_TIMEOUT = 3600
        
        with patch('backend.main.generate_livekit_token') as mock_token:
            mock_token.return_value = "mock_jwt_token"
            
            # First create a session
            create_response = client.post("/api/voice/start-session", json={
                "user_identity": self.test_user_identity,
                "participant_name": "Test User"
            })
            
            assert create_response.status_code == 200
            session_id = create_response.json()["session_id"]
            
            # Then get its status
            status_response = client.get(f"/api/voice/session/{session_id}")
            
            assert status_response.status_code == 200
            status_data = status_response.json()
            
            assert status_data["session_id"] == session_id
            assert status_data["status"] == "active"
            assert "created_at" in status_data
            assert "expires_at" in status_data
    
    def test_get_voice_session_status_not_found(self):
        """Test retrieving status for non-existent session"""
        fake_session_id = str(uuid.uuid4())
        
        response = client.get(f"/api/voice/session/{fake_session_id}")
        
        assert response.status_code == 404
        assert "Voice session not found" in response.json()["detail"]
    
    @patch('backend.main.settings')
    def test_end_voice_session(self, mock_settings):
        """Test ending a voice session"""
        mock_settings.LIVEKIT_API_KEY = "test_api_key"
        mock_settings.LIVEKIT_API_SECRET = "test_api_secret"
        mock_settings.LIVEKIT_URL = "wss://test.livekit.io"
        mock_settings.MAX_CONCURRENT_SESSIONS = 10
        mock_settings.VOICE_SESSION_TIMEOUT = 3600
        
        with patch('backend.main.generate_livekit_token') as mock_token:
            mock_token.return_value = "mock_jwt_token"
            
            # First create a session
            create_response = client.post("/api/voice/start-session", json={
                "user_identity": self.test_user_identity,
                "participant_name": "Test User"
            })
            
            assert create_response.status_code == 200
            session_id = create_response.json()["session_id"]
            
            # Then end it
            end_response = client.delete(f"/api/voice/session/{session_id}")
            
            assert end_response.status_code == 200
            end_data = end_response.json()
            
            assert end_data["session_id"] == session_id
            assert "ended successfully" in end_data["message"]
            
            # Verify session is no longer accessible
            status_response = client.get(f"/api/voice/session/{session_id}")
            assert status_response.status_code == 404
    
    def test_end_voice_session_not_found(self):
        """Test ending a non-existent session"""
        fake_session_id = str(uuid.uuid4())
        
        response = client.delete(f"/api/voice/session/{fake_session_id}")
        
        assert response.status_code == 404
        assert "Voice session not found" in response.json()["detail"]
    
    def test_list_active_sessions(self):
        """Test listing active voice sessions"""
        response = client.get("/api/voice/sessions")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "active_sessions" in data
        assert "total_count" in data
        assert isinstance(data["active_sessions"], list)
        assert data["total_count"] == len(data["active_sessions"])
    
    @patch('backend.main.settings')
    def test_max_concurrent_sessions_limit(self, mock_settings):
        """Test maximum concurrent sessions limit"""
        mock_settings.LIVEKIT_API_KEY = "test_api_key"
        mock_settings.LIVEKIT_API_SECRET = "test_api_secret"
        mock_settings.LIVEKIT_URL = "wss://test.livekit.io"
        mock_settings.MAX_CONCURRENT_SESSIONS = 1  # Set limit to 1
        mock_settings.VOICE_SESSION_TIMEOUT = 3600
        
        with patch('backend.main.generate_livekit_token') as mock_token:
            mock_token.return_value = "mock_jwt_token"
            
            # Create first session (should succeed)
            response1 = client.post("/api/voice/start-session", json={
                "user_identity": f"{self.test_user_identity}_1",
                "participant_name": "Test User 1"
            })
            
            assert response1.status_code == 200
            
            # Try to create second session (should fail due to limit)
            response2 = client.post("/api/voice/start-session", json={
                "user_identity": f"{self.test_user_identity}_2",
                "participant_name": "Test User 2"
            })
            
            assert response2.status_code == 429
            assert "Maximum number of concurrent voice sessions reached" in response2.json()["detail"]

class TestLiveKitTokenGeneration:
    """Test suite for LiveKit token generation"""
    
    @patch('backend.main.settings')
    def test_generate_livekit_token_success(self, mock_settings):
        """Test successful LiveKit token generation"""
        from backend.main import generate_livekit_token
        
        mock_settings.LIVEKIT_API_KEY = "test_api_key"
        mock_settings.LIVEKIT_API_SECRET = "test_api_secret"
        mock_settings.VOICE_SESSION_TIMEOUT = 3600
        
        with patch('backend.main.AccessToken') as mock_access_token:
            mock_token_instance = MagicMock()
            mock_token_instance.to_jwt.return_value = "mock_jwt_token"
            mock_access_token.return_value = mock_token_instance
            
            token = generate_livekit_token("test_room", "test_user", "Test User")
            
            assert token == "mock_jwt_token"
            mock_access_token.assert_called_once_with("test_api_key", "test_api_secret")
            mock_token_instance.with_identity.assert_called_once_with("test_user")
            mock_token_instance.with_name.assert_called_once_with("Test User")
            mock_token_instance.with_ttl.assert_called_once_with(3600)
    
    @patch('backend.main.settings')
    def test_generate_livekit_token_missing_credentials(self, mock_settings):
        """Test LiveKit token generation without credentials"""
        from backend.main import generate_livekit_token
        from fastapi import HTTPException
        
        mock_settings.LIVEKIT_API_KEY = None
        mock_settings.LIVEKIT_API_SECRET = None
        
        with pytest.raises(HTTPException) as exc_info:
            generate_livekit_token("test_room", "test_user")
        
        assert exc_info.value.status_code == 500
        assert "LiveKit credentials not configured" in str(exc_info.value.detail)

if __name__ == "__main__":
    pytest.main([__file__])