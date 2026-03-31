export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          location: string;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          location: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          location?: string;
          phone?: string | null;
          updated_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          price: number;
          category: string;
          condition: string;
          image_url: string;
          location: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          price: number;
          category: string;
          condition: string;
          image_url: string;
          location: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          price?: number;
          category?: string;
          condition?: string;
          image_url?: string;
          location?: string;
          status?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Listing = Database['public']['Tables']['listings']['Row'];
export type ListingWithProfile = Listing & {
  profiles: Profile;
};
