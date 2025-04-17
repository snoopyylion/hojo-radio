import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center pt-[150px]"
      style={{ backgroundImage: "url('/img/bg-sign2.jpg')" }} // replace with your actual image path
    >
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </div>
  );
}
