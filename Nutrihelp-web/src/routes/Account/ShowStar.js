import './Account.css';
import './ShowStar.css';

function ShowStar({ title, star, isVisible }) {
    const stars = '⭐'.repeat(star); 

    return (
        <div className={`col-lg-12 ShowStar`} style={{ opacity: isVisible ? 1 : 0 }}>
            <div className='container'>
                <div className='row'>
                    <h1>{`Title: ${title}`}</h1>
                    <h1>{`The system gives you a rating of: ${stars}`}</h1>
                </div>
            </div>
        </div>
    );
}

export default ShowStar;
