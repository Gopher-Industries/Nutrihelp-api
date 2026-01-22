const supabase = require('../dbConnection.js');
const bcrypt = require('bcryptjs');

async function createTestUser() {
    console.log('👤 Creating test user...\n');
    
    try {
        // Check if user with user_id=1 already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('user_id, name, email')
            .eq('user_id', 1)
            .single();
        
        if (existingUser) {
            console.log('✅ User with user_id=1 already exists:');
            console.log(`   - ID: ${existingUser.user_id}`);
            console.log(`   - Name: ${existingUser.name}`);
            console.log(`   - Email: ${existingUser.email}`);
            return existingUser;
        }
        
        // Create a new test user
        const testEmail = `testuser${Date.now()}@test.com`;
        const hashedPassword = await bcrypt.hash("testuser123", 10);
        
        console.log('📝 Creating new test user with user_id=1...');
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                user_id: 1, // Explicitly set user_id to 1
                name: "Test User for Shopping List",
                email: testEmail,
                password: hashedPassword,
                mfa_enabled: false,
                contact_number: "000000000",
                address: "Test Address",
                account_status: "active",
                email_verified: true,
                is_verified: true
            })
            .select()
            .single();

        if (createError) {
            console.error('❌ Failed to create test user:', createError);
            
            // If setting user_id=1 fails, try creating without specifying user_id
            console.log('🔄 Trying to create user without specifying user_id...');
            const { data: autoUser, error: autoError } = await supabase
                .from('users')
                .insert({
                    name: "Test User for Shopping List",
                    email: testEmail,
                    password: hashedPassword,
                    mfa_enabled: false,
                    contact_number: "000000000",
                    address: "Test Address",
                    account_status: "active",
                    email_verified: true,
                    is_verified: true
                })
                .select()
                .single();
            
            if (autoError) {
                throw autoError;
            }
            
            console.log('✅ Created test user with auto-generated user_id:');
            console.log(`   - ID: ${autoUser.user_id}`);
            console.log(`   - Name: ${autoUser.name}`);
            console.log(`   - Email: ${autoUser.email}`);
            console.log(`\n💡 Note: This user has user_id=${autoUser.user_id}, not user_id=1`);
            console.log(`   Update your test code to use user_id: ${autoUser.user_id}`);
            
            return autoUser;
        }
        
        console.log('✅ Successfully created test user with user_id=1:');
        console.log(`   - ID: ${newUser.user_id}`);
        console.log(`   - Name: ${newUser.name}`);
        console.log(`   - Email: ${newUser.email}`);
        console.log(`   - Password: testuser123`);
        
        return newUser;
        
    } catch (error) {
        console.error('💥 Error creating test user:', error);
        throw error;
    }
}

// Run the function if this file is executed directly
if (require.main === module) {
    createTestUser()
        .then(() => {
            console.log('\n🎉 Test user creation completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test user creation failed:', error);
            process.exit(1);
        });
}

module.exports = { createTestUser };
