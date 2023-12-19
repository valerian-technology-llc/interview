interface Profile {
  // Define the structure of the Profile object
  // Add properties and their types here
}

interface Groups {
  // Define the structure of the Groups object
  // Add properties and their types here
}

export class AuthenticationManager {
    private baseUrl: string;
    constructor(baseUrl: string) {
      this.baseUrl = baseUrl;
    }
    
    private makeFetchRequest(url: string, method: string, body?: object): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestOptions: RequestInit = {
        method: method,
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        referrerPolicy: "no-referrer",
      };

      if (body) {
        requestOptions.body = JSON.stringify(body);
      }

      fetch(url, requestOptions)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Request failed with status ${response.status}');
          }
          return response.json();
        })
        .then(resolve)
        .catch(reject);
    });
  }
    
  public async isLoggedIn(): Promise<boolean> {
    const token = localStorage.getItem("auth_token");
    if (!token) return Promise.resolve(false);

    try {
      const valid = await this.validateToken(token);
      return valid;
    } catch {
      this.clearAuthToken();
      return false;
    }
  }

  private async validateToken(token: string): Promise<boolean> {
    try {
      const response = await this.makeFetchRequest('${this.baseUrl}/validateToken', "POST", { token });
      return !!response;
    } catch {
      this.clearAuthToken();
      return false;
    }
  }
    
  private clearAuthToken() {
    localStorage.removeItem("auth_token");
  }

  public async login(username: string, password: string, rememberMe: boolean): Promise<{ profile: Profile; groups: Groups }> {
    try {
      const loginResponse = await this.makeFetchRequest('${this.baseUrl}/login', "POST", { username, password });
      if (rememberMe) {
        const token = loginResponse as string; // Assuming loginResponse is the token
        localStorage.setItem("auth_token", token);
      }
      const [profile, groups] = await Promise.all([this.fetchProfile(username), this.fetchRoles(username)]);
      return ({ profile, groups });
    } catch (error) {
      console.error("Error logging in:", error);
      throw new Error("Login failed");
    }
  }

  private async fetchProfile(username: string): Promise<Profile> {
    try {
      const profileResponse = await this.makeFetchRequest('${this.baseUrl}/profile/${username}', "GET");
      return profileResponse as Profile;
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw new Error("Failed to fetch profile");
    }
  }

  private async fetchRoles(username: string): Promise<Groups> {
    try {
      const rolesResponse = await this.makeFetchRequest('${this.baseUrl}/roles/${username}', "GET");
      return rolesResponse as Groups;
    } catch (error) {
      console.error("Error fetching roles:", error);
      throw new Error("Failed to fetch roles");
    }
  }

  public async getProfileForLoggedInUser(): Promise<{ profile: Profile; groups: Groups }> {
    const token = localStorage.getItem("auth_token");
    if (!token) return Promise.reject(new Error("User not logged in"));

    try {
      const response = await this.makeFetchRequest('${this.baseUrl}/get?token=${token}', "GET");
      const { username } = response;
      const [profile, groups] = await Promise.all([this.fetchProfile(username), this.fetchRoles(username)]);
      return ({ profile, groups });
    } catch (error) {
      console.error("Error getting profile for logged-in user:", error);
      throw new Error("Failed to fetch profile");
    }
  }
 
  public async logout(): Promise<void> {
    const token = localStorage.getItem("auth_token");
    if (!token) return Promise.resolve();

    try {
      await this.makeFetchRequest('${this.baseUrl}/logout', "POST", { token });
      this.clearAuthToken();
    } catch (error) {
      console.error("Error logging out:", error);
      throw new Error("Logout failed");
    }
  }
}
