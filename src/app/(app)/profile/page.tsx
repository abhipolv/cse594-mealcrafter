import { ScreenStub } from "@/components/screen-stub";
import { logout } from "@/app/login/actions";

export default function Page() {
  return (
    <>
      <ScreenStub code="17" back="/" />
      <form action={logout} className="px-5 pb-8">
        <button type="submit" className="btn w-full">
          Log out
        </button>
      </form>
    </>
  );
}
