import React, { useContext, useEffect } from "react";
import "semantic-ui-css/semantic.min.css";
import "./App.css";
import { initializeFontSize } from "./utils/fontSizeManager";
import "./styles/global-dark-mode.css";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from "react-router-dom";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { UserContext } from "./context/user.context";

import Login from "./routes/Login/Login";
import SignUp from "./routes/SignUp/SignUp";
import ForgotPassword from "./routes/ForgotPassword/ForgotPassword";
import ForgotPasswordVerify from "./routes/ForgotPassword/ForgotPasswordVerify";
import ForgotPasswordReset from "./routes/ForgotPassword/ForgotPasswordReset";
import CreateRecipe from "./routes/CreateRecipe/CreateRecipe";
import SearchRecipes from "./routes/SearchRecipes/SearchRecipes";
import CategoryResults from "./routes/SearchRecipes/CategoryResults";
import YourPreferences from './routes/UI-Only-Pages/YourPreferences/YourPreferences';
import UserProfilePage from "./routes/UI-Only-Pages/UserProfilePage/userprofile";
import Home from "./routes/Home/Home";
import DietaryRequirements from "./routes/UI-Only-Pages/DietaryRequirements/DietaryRequirements";
import ScanProducts from "./routes/UI-Only-Pages/ScanProducts/ScanProducts";
import Menu from "./routes/UI-Only-Pages/Menu/Menu";
import Recipe from "./routes/MyRecipe/Recipe";
import Appointment from "./routes/UI-Only-Pages/Appointment/Appointment";
import newMenu from "./routes/NewMenu/newMenu";
import Meal from "./routes/Meal/Meal";
import Scan from "./routes/ScanBarcode/Scan.jsx"
import MFAform from "./routes/MFA/MFAform";
import Dashboard from "./routes/NewMenu/Dashboard";
import AuthenticateRoute from "./routes/AuthenticateRoute/AuthenticateRoute";
import MainNavbar from "./components/MainNavbar";
import FAQ from "./routes/FAQ/faq";
import NutritionCalculator from "./routes/UI-Only-Pages/NutritionCalculator/NutritionCalculator";
import HealthNews from "./routes/HealthNews/HealthNews";
import NewsDetail from "./routes/HealthNews/NewsDetail";
import FoodPreferences from "./routes/FoodPreferences/FoodPreferences";
import HealthTools from "./routes/HealthTools/HealthTools";
import RecipeRating from "./routes/RecipeRating/RecipeRating";
import ShoppingList from "./routes/UI-Only-Pages/ShoppingList/ShoppingList";
import RecipeDetail from "./routes/RecipeRating/RecipeDetail";
import SymptomAssessment from "./routes/SymptomAssessment/SymptomAssessment";
import Leaderboard from "./routes/LeaderBoard/leaderBoard";
import ObesityPredictor from "./routes/survey/ObesityPredictor";
import Predictionresult from "./routes/survey/predictionresult";
import UiTimer from "./routes/UiTimer/UiTimer";
import Settings from "./routes/Settings/Settings";
import HealthFAQ from "./routes/HealthFAQ/HealthFAQ";
import FitnessRoadmap from "./routes/survey/FitnessRoadmap";
import Community from "./routes/Community/Community";
import ChatPage from "./routes/chat/ChatPage";
import PostDetail from "./routes/Community/PostDetail";
import ScanBarcode from "./routes/ScanBarcode/ScanBarcode";
import AuthCallback from "./pages/AuthCallback";
import DailyPlanEdit from "./routes/DailyPlan/DailyPlanEdit";
import Account from "./routes/Account/Account.js";
/* -------------------------------
   NAVBAR WRAPPER (HIDE ON ROUTES)
-------------------------------- */
function NavbarWrapper() {
  const location = useLocation();

  const hideNavbarRoutes = [
    "/login",
    "/signup",
    "/forgot",
    "/forgotpassword",
    "/forgot/verify",
    "/forgot/reset",
    "/mfaform",
  ];

  const currentPath = location.pathname.toLowerCase();

  const shouldHideNavbar = hideNavbarRoutes.some((route) =>
    currentPath.startsWith(route)
  );

  return shouldHideNavbar ? null : <MainNavbar />;
}

import WeeklyMealPlanPage from './routes/Meal/WeeklyMealPlanPage';

function App() {
  const { currentUser } = useContext(UserContext);

  useEffect(() => {
    initializeFontSize();
  }, []);

  return (
    <Router>
      {/* Show navbar only on allowed pages */}
      <NavbarWrapper />

      <ToastContainer />

      <Routes>
        <Route
          path="/"
          element={
            currentUser ? <Navigate to="/home" /> : <Navigate to="/login" />
          }
        />

        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />


        {/* Forgot password flow */}
        {/* legacy route */}
        <Route path="/forgotPassword" element={<ForgotPassword />} />
        {/* new multi-step flow routes */}
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/forgot/verify" element={<ForgotPasswordVerify />} />
        <Route path="/forgot/reset" element={<ForgotPasswordReset />} />

        <Route path="/mfa" element={<MFAform />} />

        <Route path="/home" element={<Home />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/community" element={<Community />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/community/post/:postId" element={<PostDetail />} />

        <Route path="/survey" element={<ObesityPredictor />} />
        <Route path="/survey/result" element={<Predictionresult />} />
        <Route path="/roadmap" element={<FitnessRoadmap />} />
        <Route path="/Scan" element={<Scan />} />
        <Route path="/Meal" element={<Meal />} />
        <Route path="/account" element={<Account />} />
        {/* PRIVATE ROUTES */}
        <Route
          path="/daily-plan-edit"
          element={
            <AuthenticateRoute>
              <DailyPlanEdit />
            </AuthenticateRoute>
          }
        />

        <Route
          path="createRecipe"
          element={
            <AuthenticateRoute>
              <CreateRecipe />
            </AuthenticateRoute>
          }
        />

        <Route
          path="searchRecipes"
          element={
            <AuthenticateRoute>
              <SearchRecipes />
            </AuthenticateRoute>
          }
        />

        <Route
          path="searchRecipes/:category"
          element={
            <AuthenticateRoute>
              <CategoryResults />
            </AuthenticateRoute>
          }
        />

        <Route
          path="yourPreferences"
          element={
            <AuthenticateRoute>
              <YourPreferences />
            </AuthenticateRoute>
          }
        />

        <Route
          path="userProfile"
          element={
            <AuthenticateRoute>
              <UserProfilePage />
            </AuthenticateRoute>
          }
        />

        <Route
          path="Appointment"
          element={
            <AuthenticateRoute>
              <Appointment />
            </AuthenticateRoute>
          }
        />

        <Route
          path="dietaryRequirements"
          element={
            <AuthenticateRoute>
              <DietaryRequirements />
            </AuthenticateRoute>
          }
        />

        <Route
          path="ScanProducts"
          element={
            <AuthenticateRoute>
              <ScanProducts />
            </AuthenticateRoute>
          }
        />

        <Route
          path="RecipeRating"
          element={
            <AuthenticateRoute>
              <RecipeRating />
            </AuthenticateRoute>
          }
        />

        <Route
          path="UiTimer"
          element={
            <AuthenticateRoute>
              <UiTimer />
            </AuthenticateRoute>
          }
        />

        <Route
          path="menu"
          element={
            <AuthenticateRoute>
              <Menu />
            </AuthenticateRoute>
          }
        />

        <Route
          path="recipe"
          element={
            <AuthenticateRoute>
              <Recipe />
            </AuthenticateRoute>
          }
        />

        <Route path="/recipe/:id" element={<RecipeDetail />} />
        <Route
          path="Meal"
          element={
            <AuthenticateRoute>
              <Meal />
            </AuthenticateRoute>
          }
        />

        <Route path="/weekly-plan" element={<WeeklyMealPlanPage />} />
        

        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route
          path="nutrition-calculator"
          element={
            <AuthenticateRoute>
              <NutritionCalculator />
            </AuthenticateRoute>
          }
        />

        <Route path="/preferences" element={<FoodPreferences />} />

        <Route path="/symptomassessment" element={<SymptomAssessment />} />

        <Route
          path="healthnews"
          element={
            <AuthenticateRoute>
              <HealthNews />
            </AuthenticateRoute>
          }
        />

        <Route
          path="healthnews/:id"
          element={
            <AuthenticateRoute>
              <NewsDetail />
            </AuthenticateRoute>
          }
        />

        <Route
          path="dashboard"
          element={
            <AuthenticateRoute>
              <Dashboard />
            </AuthenticateRoute>
          }
        />

        <Route
          path="HealthTools"
          element={
            <AuthenticateRoute>
              <HealthTools />
            </AuthenticateRoute>
          }
        />

        <Route
          path="shopping-list"
          element={
            <AuthenticateRoute>
              <ShoppingList />
            </AuthenticateRoute>
          }
        />

        <Route
          path="settings"
          element={
            <AuthenticateRoute>
              <Settings />
            </AuthenticateRoute>
          }
        />

        <Route
          path="HealthFAQ"
          element={
            <AuthenticateRoute>
              <HealthFAQ />
            </AuthenticateRoute>
          }
        />

        <Route path="ScanBarcode" element={<ScanBarcode />} />
        <Route path="Scan" element={<Scan />}/>
      </Routes>
    </Router>
  );
}

export default App;
