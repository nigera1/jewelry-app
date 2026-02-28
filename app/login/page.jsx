import { login } from './actions'

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-sm mb-8 text-center">
                <h1 className="font-black italic text-4xl tracking-tighter uppercase leading-none">
                    ATELIER OS
                </h1>
            </div>

            <div className="w-full max-w-sm bg-white border-2 border-black rounded-[2rem] p-6 shadow-[6px_6px_0px_0px_black]">
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-4 text-center">Sign In</h2>

                <form className="space-y-4" action={login}>
                    <div>
                        <label className="text-xs font-black uppercase text-gray-400 mb-0.5 block" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="w-full p-2.5 bg-white text-black border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-yellow-50"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-black uppercase text-gray-400 mb-0.5 block" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="w-full p-2.5 bg-white text-black border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-yellow-50"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white p-3 border-2 border-black rounded-xl font-black text-sm uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5 transition-all mt-6"
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>
    )
}
