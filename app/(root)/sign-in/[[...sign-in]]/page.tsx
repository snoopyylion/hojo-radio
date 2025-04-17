import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center pt-[150px]"
      style={{ backgroundImage: "url('/img/bg-sign2.jpg')" }} // replace with your actual image path
    >
      <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-xl shadow-lg">
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          afterSignInUrl="/blog"
          afterSignUpUrl="/sign-in"
        />
      </div>
    </div>
  );
}
