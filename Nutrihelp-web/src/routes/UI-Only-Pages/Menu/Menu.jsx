import React, { useState, useEffect, useRef } from 'react';
import './menu.css'; // Import your CSS file here

const Menu = () => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState([]);
    const navRef = useRef();
    const searchIconRef = useRef();

    // List of food items
    const foodItems = [
        {
            name: 'Avocado',
            imageUrl: 'https://domf5oio6qrcr.cloudfront.net/medialibrary/5138/h0618g16207257173805.jpg',
            description: 'Rich in healthy monounsaturated fats and a good source of fiber. Avocados also contain various vitamins and minerals.'
        },
        {
            name: 'Salmon',
            imageUrl: 'https://images.theconversation.com/files/249331/original/file-20181206-128208-1lepxpi.jpg?ixlib=rb-1.1.0&q=45&auto=format&w=1356&h=668&fit=crop',
            description: 'An excellent source of omega-3 fatty acids and high-quality protein. Salmon is also rich in vitamin D and various minerals.'
        },
        {
            name: 'Broccoli',
            imageUrl: 'https://cdn.apartmenttherapy.info/image/upload/f_jpg,q_auto:eco,c_fill,g_auto,w_1500,ar_1:1/k%2Farchive%2Fd852987f86aeae8b65926f9e7a260c28285ea744',
            description: 'Packed with vitamins (especially vitamin C and K), minerals, and antioxidants. Broccoli is a great source of fiber and has various health benefits.'
        },
        {
            name: 'Chicken Wings',
            imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRfd6SFL5sSIHlwcDV7db1dfWSpBCtyO6gujA&usqp=CAU',
            description: 'An excellent source of protein, vitamins, and antioxidants. Wings are a great source of good fat and have various health benefits.'
        },
        {
            name: 'Pasta',
            imageUrl: 'https://www.foodandwine.com/thmb/97PY4E6Wk95IYv1_8pDZvBEi0Uw=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/cream-tomato-rigatoni-FT-RECIPE1020-139fb3fa52574e8bb06f98e7fa3e4f1e.jpg',
            description: 'Pasta, a staple in many cuisines, is a versatile and comforting food made from durum wheat semolina, offering a satisfying source of carbohydrates for energy.'
        },
        {
            name: 'Oatmeal',
            imageUrl: 'https://images.immediate.co.uk/production/volatile/sites/30/2023/08/Porridge-oats-d09fae8.jpg?quality=90&resize=440,400',
            description: 'Oats are a nutritious whole grain known for their high fiber content, providing a heart-healthy option that helps lower cholesterol levels and supports digestive health.'
        },
        {
            name: 'Omelete',
            imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQo6q5-FWYZNd5DgwNQd5_1JwN30iq7KXkEVQ&usqp=CAU',
            description: 'A classic and customizable dish made by whisking eggs and cooking them with various fillings such as vegetables, cheese, and meats, offering a delicious and protein-rich breakfast or brunch option.'
        },
        {
            name: 'Hotdog',
            imageUrl: 'https://hips.hearstapps.com/hmg-prod/images/delish-202104-airfryerhotdogs-044-1619472270.jpg?crop=0.448xw:1.00xh;0.0657xw,0&resize=980:*',
            description: 'Hotdogs are a popular street food with diverse regional variations, reflecting a beloved and simple pleasure in many culinary traditions.'
        },

        {
            name: 'Quinoa Salad',
            imageUrl: 'https://cooktoria.com/wp-content/uploads/2018/08/Mediterranean-Quinoa-Salad-SQ-1.jpg',
            description: 'A healthy and refreshing salad with quinoa, mixed greens, and a variety of colorful vegetables, dressed in a light vinaigrette.'
        },
        {
            name: 'Berry Smoothie',
            imageUrl: 'https://www.jessicagavin.com/wp-content/uploads/2020/07/berry-smoothie-8-1200.jpg',
            description: 'A delicious blend of mixed berries, yogurt, and honey, perfect for a nutritious and energizing start to the day.'
        },
        {
            name: 'Vegetable Stir-Fry',
            imageUrl: 'https://www.dinneratthezoo.com/wp-content/uploads/2019/02/vegetable-stir-fry-3.jpg',
            description: 'A savory mix of stir-fried vegetables like bell peppers, broccoli, and carrots, seasoned with soy sauce and served over rice or noodles.'
        },
        {
            name: 'Chocolate Cake',
            imageUrl: 'https://sugargeekshow.com/wp-content/uploads/2023/10/easy_chocolate_cake_slice.jpg',
            description: 'A rich and moist chocolate cake layered with creamy chocolate frosting, a perfect dessert for any chocolate lover.'
        }
    ];

    useEffect(() => {
        const searchIcon = searchIconRef.current;
        if (searchIcon) {
            searchIcon.className = isSearchOpen ? "uil-times" : "uil-search";
        }

        // Filter the items based on the search term
        if (searchTerm) {
            const filtered = foodItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
            setFilteredItems(filtered);
        } else {
            setFilteredItems(foodItems);
        }
    }, [isSearchOpen, searchTerm]);

    const toggleSearch = () => {
        setIsSearchOpen(!isSearchOpen);
        setIsNavOpen(false);
    };

    const openNav = () => {
        setIsNavOpen(true);
        setIsSearchOpen(false);
    };

    const closeNav = () => {
        setIsNavOpen(false);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    return (
        <div>
            <nav ref={navRef} className={`${isSearchOpen ? "openSearch" : ""} ${isNavOpen ? "openNav" : ""}`}>
                <ul>
                    <li><a href="#">Home</a></li>
                    <li><a href="#">Menu</a></li>
                    <li><a href="#">About</a></li>
                    <li><a href="#">Profile</a></li>
                </ul>
            </nav>

            <header>
                <h1>NutriHelp Menu</h1>
                <input type="text" id="searchInput" placeholder="Search for food..." onChange={handleSearchChange} />
                <button onClick={toggleSearch}>Search</button>
            </header>

            <div id="menuContainer">
                {filteredItems.map(item => (
                    <div className="food-item" key={item.name}>
                        <img src={item.imageUrl} alt={item.name} />
                        <h2>{item.name}</h2>
                        <p>{item.description}</p>
                    </div>
                ))}
            </div>

            {/* Additional elements and components */}
            <div id="searchIcon" ref={searchIconRef} onClick={toggleSearch}></div>
            <button className="navOpenBtn" onClick={openNav}></button>
            <button className="navCloseBtn" onClick={closeNav}></button>
        </div>
    );
};

export default Menu;


