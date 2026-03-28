// import React, { useState } from 'react';

// //Un-comment the line below to show the CSS
// // import './signinsignup.css';

// const SignInSignUp = () => {
//     const [isActive, setIsActive] = useState(false);

//     const handleRegisterClick = () => {
//         setIsActive(true);
//     };

//     const handleLoginClick = () => {
//         setIsActive(false);
//     };

//     return (
//         <div className={`container ${isActive ? 'active' : ''}`} id="container">
//             <div className="form-container sign-up">
//                 <form>
//                     <h1>Create Account</h1>
//                     <div className="social-icons">
//                         <a href="#" className="icon"><i className="fa-brands fa-google-plus-g"></i></a>
//                         <a href="#" className="icon"><i className="fa-brands fa-facebook-f"></i></a>
//                     </div>
//                     <span>or use your email for registration</span>
//                     <input type="text" placeholder="Name" />
//                     <input type="email" placeholder="Email" />
//                     <input type="password" placeholder="Password" />
//                     <button>Sign Up</button>
//                 </form>
//             </div>
//             <div className="form-container sign-in">
//                 <form>
//                     <h1>Sign In</h1>
//                     <div className="social-icons">
//                         <a href="#" className="icon"><i className="fa-brands fa-google-plus-g"></i></a>
//                         <a href="#" className="icon"><i className="fa-brands fa-facebook-f"></i></a>
//                     </div>
//                     <span>or use your email password</span>
//                     <input type="email" placeholder="Email" />
//                     <input type="password" placeholder="Password" />
//                     <a href="#">Forget Your Password? </a>
//                     <button>Sign In</button>
//                 </form>
//             </div>
//             <div className="toggle-container">
//                 <div className="toggle">
//                     <div className="toggle-panel toggle-left">
//                         <h1>Welcome Back!</h1>
//                         <p>Enter your personal details to use all of site features</p>
//                         <button className="hidden" onClick={handleLoginClick}>Sign In</button>
//                     </div>
//                     <div className="toggle-panel toggle-right">
//                         <h1>NutriHelp</h1>
//                         <p>Register with your personal details to use all of site features</p>
//                         <button className="hidden" onClick={handleRegisterClick}>Sign Up</button>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default SignInSignUp;
