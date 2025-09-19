// Simple test script to verify API connectivity
const API_BASE_URL = "http://localhost:8000/api";

async function testAPI() {
  console.log("Testing API connectivity...");

  try {
    // Test health check endpoint
    console.log("1. Testing health check endpoint...");
    const healthResponse = await fetch(`${API_BASE_URL}/health/`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log("✅ Health check successful:", healthData);
    } else {
      console.log("❌ Health check failed:", healthResponse.status);
    }

    // Test login endpoint (this will fail without credentials, but should return proper error)
    console.log("2. Testing login endpoint...");
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'test',
        password: 'test'
      })
    });

    if (loginResponse.status === 400 || loginResponse.status === 401) {
      console.log("✅ Login endpoint responding correctly (expected auth failure)");
    } else {
      console.log("❌ Login endpoint unexpected response:", loginResponse.status);
    }

    // Test teachers endpoint (should require auth)
    console.log("3. Testing teachers endpoint...");
    const teachersResponse = await fetch(`${API_BASE_URL}/teachers/`);
    if (teachersResponse.status === 401) {
      console.log("✅ Teachers endpoint correctly requires authentication");
    } else {
      console.log("❌ Teachers endpoint unexpected response:", teachersResponse.status);
    }

  } catch (error) {
    console.log("❌ Network error:", error.message);
    console.log("💡 Make sure the Django server is running on http://localhost:8000");
  }
}

testAPI();