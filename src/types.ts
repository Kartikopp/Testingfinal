export interface Course {
  id: number;
  title: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
}

export interface Order {
  id: number;
  course_id: number;
  customer_email: string;
  amount: number;
  status: string;
  created_at: string;
  course_title?: string;
}

export interface Admin {
  username: string;
}
